package com.wordweft.book.service;

import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.model.LibraryEntry;
import com.wordweft.book.model.ReadingProgress;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.book.repository.ReadingProgressRepository;
import com.wordweft.user.model.User;
import com.wordweft.exception.ContentRestrictedException;
import org.bson.Document;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.AggregationOperation;
import org.springframework.data.mongodb.core.aggregation.AggregationUpdate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;

@Service
public class ReadingProgressService {
    private static final int COMPLETION_PERCENTAGE = 90;
    private final MongoTemplate mongo;
    private final BookRepository books;
    private final ReadingProgressRepository progressRepository;
    private final ContentAccessService contentAccess;

    public ReadingProgressService(MongoTemplate mongo, BookRepository books, ReadingProgressRepository progressRepository, ContentAccessService contentAccess) {
        this.mongo = mongo;
        this.books = books;
        this.progressRepository = progressRepository;
        this.contentAccess = contentAccess;
    }

    public ReadingProgress getProgress(String userId, String bookId) {
        ReadingProgress progress = progressRepository.findByUserIdAndBookId(userId, bookId).orElse(null);
        return progress == null ? null : books.findProgressMetadataById(bookId).map(book -> normalize(progress, book)).orElse(null);
    }

    public Map<String, ReadingProgress> getAllProgress(String userId) {
        List<ReadingProgress> records = progressRepository.findByUserId(userId);
        if (records.isEmpty()) return Map.of();
        Map<String, Book> bookMap = new HashMap<>();
        books.findProgressMetadataByIdIn(records.stream().map(ReadingProgress::getBookId).distinct().toList())
                .forEach(book -> bookMap.put(book.getId(), book));
        Map<String, ReadingProgress> result = new HashMap<>();
        for (ReadingProgress progress : records) {
            Book book = bookMap.get(progress.getBookId());
            if (book != null) result.put(book.getId(), normalize(progress, book));
        }
        return result;
    }

    public ReadingProgress saveProgress(String userId, SaveRequest request) {
        // Progress updates need released metadata, never either chapter manuscript.
        Book book = mongo.findOne(BookMetadataProjection.apply(Query.query(Criteria.where("_id").is(request.bookId()))), Book.class);
        if (book == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Book not found.");
        if (!Objects.equals(book.getAuthorId(), userId) && !"published".equals(book.getPublicationStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Story not found.");
        }
        if (!contentAccess.canAccess(book)) throw new ContentRestrictedException("Your account cannot access this story. Check its age rating and your reading settings.");
        List<Chapter> published = publishedChapters(book);
        int chapterIndex = indexOf(published, request.chapterId());
        if (chapterIndex < 0) {
            throw badRequest("Reading progress can only be saved for a published chapter.");
        }
        List<String> publishedIds = published.stream().map(Chapter::getId).toList();
        Query query = progressQuery(userId, book.getId());
        AggregationUpdate update = progressUpdate(userId, request, chapterIndex, publishedIds);

        // Mongo serializes this single-document update. Returning the old document also
        // claims each first completion exactly once, even when saves arrive together.
        ReadingProgress before;
        try {
            before = mongo.findAndModify(query, update, FindAndModifyOptions.options().upsert(true), ReadingProgress.class);
        } catch (DuplicateKeyException concurrentFirstSave) {
            before = mongo.findAndModify(query, update, FindAndModifyOptions.options(), ReadingProgress.class);
        }
        Set<String> completed = before == null || before.getCompletedChapterIds() == null
                ? new HashSet<>() : new HashSet<>(before.getCompletedChapterIds());
        boolean firstChapterCompletion = request.progress() >= COMPLETION_PERCENTAGE && completed.add(request.chapterId());
        boolean firstBookCompletion = !bookAlreadyCounted(before, publishedIds) && completed.containsAll(publishedIds);
        if (firstChapterCompletion || firstBookCompletion) {
            incrementStats(userId, firstChapterCompletion ? 1 : 0,
                    firstChapterCompletion ? Math.max(0, PublishedChapterView.of(published.get(chapterIndex)).wordCount()) : 0,
                    firstBookCompletion ? 1 : 0);
        }
        ensureLibraryEntry(userId, book.getId());
        return normalize(Objects.requireNonNull(mongo.findOne(query, ReadingProgress.class)), book);
    }

    public void clearProgress(String userId, String bookId) {
        // Restart the journey while retaining the lifetime counters' idempotency ledger.
        mongo.updateFirst(progressQuery(userId, bookId), new Update()
                .set("chapters", new Document()).set("overallProgress", 0)
                .set("lastReadChapterIndex", 0).unset("lastReadChapterId")
                .set("lastReadScrollPosition", 0).set("lastReadTimestamp", LocalDateTime.now()), ReadingProgress.class);
    }

    private AggregationUpdate progressUpdate(String userId, SaveRequest request, int chapterIndex, List<String> publishedIds) {
        Document initialize = new Document("userId", literal(userId)).append("bookId", literal(request.bookId()))
                .append("chapters", ifNull("$chapters", new Document()))
                .append("completedChapterIds", ifNull("$completedChapterIds", List.of()))
                .append("bookCompletionCounted", ifNull("$bookCompletionCounted", legacyBookCompletion(publishedIds)));
        String chapterPath = "chapters." + request.chapterId();
        Document chapter = new Document(chapterPath + ".progress",
                expression("$max", ifNull("$" + chapterPath + ".progress", 0), request.progress()))
                .append(chapterPath + ".scrollPosition", request.chapterScroll())
                .append("lastReadChapterId", literal(request.chapterId()))
                .append("lastReadChapterIndex", chapterIndex)
                .append("lastReadScrollPosition", request.scrollPosition())
                .append("lastReadTimestamp", Date.from(LocalDateTime.now().atZone(ZoneId.systemDefault()).toInstant()));
        if (request.progress() >= COMPLETION_PERCENTAGE) {
            chapter.append("completedChapterIds", expression("$setUnion", "$completedChapterIds", literal(List.of(request.chapterId()))));
        }
        List<Object> percentages = publishedIds.stream()
                .map(id -> (Object) ifNull("$chapters." + id + ".progress", 0)).toList();
        Document aggregate = new Document("overallProgress", new Document("$toInt",
                expression("$min", 100, expression("$max", 0,
                        expression("$divide", new Document("$sum", percentages), publishedIds.size())))))
                .append("bookCompletionCounted", expression("$or", "$bookCompletionCounted",
                        expression("$setIsSubset", literal(publishedIds), "$completedChapterIds")));
        return pipeline(initialize, chapter, aggregate);
    }

    private void incrementStats(String userId, int chapters, long words, int booksRead) {
        Document initialize = new Document("stats", ifNull("$stats", new Document()));
        Document increments = new Document("stats.chaptersRead", expression("$add", ifNull("$stats.chaptersRead", 0), chapters))
                .append("stats.totalWordsRead", expression("$add", ifNull("$stats.totalWordsRead", 0L), words))
                .append("stats.booksRead", expression("$add", ifNull("$stats.booksRead", 0), booksRead));
        mongo.updateFirst(Query.query(Criteria.where("_id").is(userId)), pipeline(initialize, increments), User.class);
    }

    private void ensureLibraryEntry(String userId, String bookId) {
        try {
            mongo.upsert(progressQuery(userId, bookId), new Update()
                    .setOnInsert("userId", userId).setOnInsert("bookId", bookId)
                    .setOnInsert("addedDate", LocalDate.now()).setOnInsert("shelfName", "My List")
                    .setOnInsert("shelfIds", Set.of()), LibraryEntry.class);
        } catch (DuplicateKeyException concurrentFirstSave) {
            // The other save has already added this same book to the reader's library.
        }
    }

    /** Read-time projection remains correct when published chapters are added, reordered, or removed. */
    ReadingProgress normalize(ReadingProgress progress, Book book) {
        List<Chapter> published = publishedChapters(book);
        Map<String, ReadingProgress.ChapterProgressItem> chapters = Objects.requireNonNullElse(progress.getChapters(), Map.of());
        Map<String, ReadingProgress.ChapterProgressItem> readableProgress = new HashMap<>();
        int total = 0;
        for (Chapter chapter : published) {
            ReadingProgress.ChapterProgressItem item = chapters.get(chapter.getId());
            if (item != null) {
                readableProgress.put(chapter.getId(), item);
                total += Math.max(0, Math.min(100, item.getProgress()));
            }
        }
        progress.setChapters(readableProgress);
        progress.setOverallProgress(published.isEmpty() ? 0 : total / published.size());
        progress.setFinished(!published.isEmpty() && published.stream().allMatch(chapter ->
                readableProgress.containsKey(chapter.getId()) && readableProgress.get(chapter.getId()).getProgress() >= COMPLETION_PERCENTAGE));
        if (published.isEmpty()) {
            progress.setLastReadChapterId(null);
            progress.setLastReadChapterIndex(0);
            progress.setLastReadScrollPosition(0);
            return progress;
        }
        int stableIndex = indexOf(published, progress.getLastReadChapterId());
        int fallback = Math.max(0, Math.min(progress.getLastReadChapterIndex(), published.size() - 1));
        if (stableIndex < 0 && progress.getLastReadChapterId() != null) {
            ReadingProgress.ChapterProgressItem item = readableProgress.get(published.get(fallback).getId());
            progress.setLastReadScrollPosition(item == null ? 0 : Math.max(0, item.getScrollPosition()));
        }
        int index = stableIndex < 0 ? fallback : stableIndex;
        progress.setLastReadChapterIndex(index);
        progress.setLastReadChapterId(published.get(index).getId());
        return progress;
    }

    private boolean bookAlreadyCounted(ReadingProgress progress, List<String> publishedIds) {
        if (progress == null) return false;
        if (progress.getBookCompletionCounted() != null) return progress.getBookCompletionCounted();
        return progress.getOverallProgress() >= 100
                || progress.getCompletedChapterIds() != null && progress.getCompletedChapterIds().containsAll(publishedIds);
    }

    private Document legacyBookCompletion(List<String> publishedIds) {
        return expression("$or", expression("$gte", ifNull("$overallProgress", 0), 100),
                expression("$setIsSubset", literal(publishedIds), ifNull("$completedChapterIds", List.of())));
    }

    private List<Chapter> publishedChapters(Book book) {
        return Objects.requireNonNullElse(book.getChapters(), List.<Chapter>of()).stream()
                .filter(Objects::nonNull).filter(chapter -> "published".equals(chapter.getStatus())).toList();
    }

    private int indexOf(List<Chapter> chapters, String id) {
        for (int index = 0; index < chapters.size(); index++) {
            if (Objects.equals(chapters.get(index).getId(), id)) return index;
        }
        return -1;
    }

    private Query progressQuery(String userId, String bookId) {
        return Query.query(Criteria.where("userId").is(userId).and("bookId").is(bookId));
    }

    private static AggregationUpdate pipeline(Document... stages) {
        List<AggregationOperation> operations = Arrays.stream(stages)
                .map(stage -> (AggregationOperation) context -> new Document("$set", stage)).toList();
        return AggregationUpdate.from(operations);
    }

    private static Document expression(String operator, Object... values) {
        return new Document(operator, Arrays.asList(values));
    }

    private static Document ifNull(Object value, Object fallback) {
        return expression("$ifNull", value, fallback);
    }

    private static Document literal(Object value) {
        return new Document("$literal", value);
    }

    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    public record SaveRequest(String bookId, String chapterId, int progress, int scrollPosition, int chapterScroll) {
        public static SaveRequest from(Map<String, Object> payload) {
            if (payload == null) throw badRequest("Reading progress is required.");
            String bookId = identifier(payload.get("bookId"), "bookId");
            if (!(payload.get("chapterData") instanceof Map<?, ?> chapter)) {
                throw badRequest("chapterData is required.");
            }
            String chapterId = identifier(chapter.get("id"), "chapterData.id");
            int progress = integer(chapter.get("progress"), "chapterData.progress", 100);
            int scroll = integer(payload.get("scrollPosition"), "scrollPosition", Integer.MAX_VALUE);
            int chapterScroll = integer(chapter.get("scroll"), "chapterData.scroll", Integer.MAX_VALUE);
            if (payload.containsKey("chapterIndex")) integer(payload.get("chapterIndex"), "chapterIndex", Integer.MAX_VALUE);
            return new SaveRequest(bookId, chapterId, progress, scroll, chapterScroll);
        }

        private static String identifier(Object value, String field) {
            if (!(value instanceof String id) || id.isBlank() || id.length() > 128 || id.contains(".") || id.contains("$")) {
                throw badRequest(field + " must be a valid identifier.");
            }
            return id;
        }

        private static int integer(Object value, String field, int maximum) {
            if (value instanceof Number number) {
                try {
                    int result = new BigDecimal(number.toString()).intValueExact();
                    if (result >= 0 && result <= maximum) return result;
                } catch (ArithmeticException | NumberFormatException invalid) {
                    // Fractions, non-finite values and overflow are invalid inputs.
                }
            }
            throw badRequest(field + " must be a whole number between 0 and " + maximum + ".");
        }
    }
}
