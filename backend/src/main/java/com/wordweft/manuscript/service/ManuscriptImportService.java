package com.wordweft.manuscript.service;

import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.book.service.ChapterImageStorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ManuscriptImportService {
    private static final int MAX_FILE_BYTES = 25 * 1024 * 1024;

    private final BookRepository books;
    private final ManuscriptParser parser;
    private final MongoTemplate mongo;
    private final ChapterImageStorageService chapterImageStorageService;
    private final ConcurrentHashMap<String, Long> importDebounce = new ConcurrentHashMap<>();

    @Autowired
    public ManuscriptImportService(
            BookRepository books,
            ManuscriptParser parser,
            @org.springframework.lang.Nullable ChapterImageStorageService chapterImageStorageService,
            MongoTemplate mongo) {
        this.books = books;
        this.mongo = mongo;
        this.parser = parser;
        this.chapterImageStorageService = chapterImageStorageService;
    }

    public ManuscriptImportService(BookRepository books, ManuscriptParser parser, MongoTemplate mongo) {
        this(books, parser, null, mongo);
    }

    public record ImportResult(
            int importedChapters,
            int totalChapters,
            int embeddedImages,
            int uploadedImages,
            List<String> characterCandidates,
            String importId,
            List<String> chapterIds) {}

    public record PreflightChapter(String title, String content, int wordCount) {}
    public record PreflightResult(List<PreflightChapter> chapters, int totalWords, int embeddedImages,
                                  List<String> characterCandidates, List<String> warnings) {}

    private Book ownedMetadata(String authorId, String bookId) {
        Book book = books.findAnalyticsMetadataById(bookId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Story not found."));
        if (authorId == null || !authorId.equals(book.getAuthorId())) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have permission to edit this story.");
        return book;
    }
    private void validateBytes(byte[] bytes) {
        if (bytes == null || bytes.length > MAX_FILE_BYTES) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Manuscripts must be 25 MB or smaller.");
    }
    public PreflightResult preflight(String authorId, String bookId, String filename, byte[] bytes) {
        ownedMetadata(authorId, bookId); validateBytes(bytes);
        try {
            var parsed = parser.parseDetailed(filename, bytes, (image, name) -> "https://import-preview.invalid/" + java.util.UUID.randomUUID());
            var chapters = parsed.chapters().stream().map(c -> new PreflightChapter(c.title(), c.content(), ManuscriptText.wordCount(c.content()))).toList();
            return new PreflightResult(chapters, chapters.stream().mapToInt(PreflightChapter::wordCount).sum(), parsed.embeddedImages(),
                    parsed.characterCandidates(), parsed.embeddedImages() > 0 ? List.of("Embedded images upload only when you confirm import.") : List.of());
        } catch (IllegalArgumentException error) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, error.getMessage()); }
    }

    public int undo(String authorId, String bookId, String importId) {
        if (importId == null || importId.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose an import to undo.");
        Book book = books.findById(bookId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Story not found."));
        if (authorId == null || !authorId.equals(book.getAuthorId())) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have permission to edit this story.");
        List<Chapter> imported = book.getChapters() == null ? List.of() : book.getChapters().stream().filter(c -> importId.equals(c.getImportBatchId())).toList();
        if (imported.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Import not found or already undone.");
        if (imported.stream().anyMatch(c -> !"draft".equals(c.getStatus()) || c.getEditRevision() != 0 || c.getPublishedContent() != null || c.getPublishedAt() != null || c.getScheduledAt() != null)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This import has edited, scheduled or released chapters. Keep those chapters and remove unwanted drafts individually.");
        }
        var predicates = new ArrayList<Criteria>();
        predicates.add(Criteria.where("_id").is(bookId).and("authorId").is(authorId));
        // Guard every draft, plus batch cardinality, against saves or releases racing this undo.
        predicates.add(Criteria.where("chapters").not().elemMatch(Criteria.where("importBatchId").is(importId).and("_id").nin(imported.stream().map(Chapter::getId).toList())));
        for (Chapter chapter : imported) predicates.add(Criteria.where("chapters").elemMatch(Criteria.where("_id").is(chapter.getId()).and("importBatchId").is(importId)
                .and("status").is("draft").and("editRevision").is(0).and("publishedContent").is(null).and("publishedAt").is(null).and("scheduledAt").is(null)
                .and("title").is(chapter.getTitle()).and("content").is(chapter.getContent())));
        if (mongo.updateFirst(Query.query(new Criteria().andOperator(predicates)), new Update().pull("chapters", new org.bson.Document("importBatchId", importId)), Book.class).getMatchedCount() != 1) {
            throw com.wordweft.book.service.ChapterWriteService.conflict();
        }
        return imported.size();
    }

    public ImportResult importManuscript(
            String authorId, String bookId, String filename, byte[] bytes) {
        Book book = ownedMetadata(authorId, bookId);
        validateBytes(bytes);

        String debounceKey = authorId + ":" + bookId;
        Long activeImport = importDebounce.putIfAbsent(debounceKey, System.currentTimeMillis());
        if (activeImport != null) {
            throw new ResponseStatusException(
                    HttpStatus.TOO_MANY_REQUESTS, "A manuscript import is already in progress. Please wait a few moments.");
        }
        try {
            ManuscriptParser.ImageUploader uploader = (imageBytes, originalName) -> {
                if (chapterImageStorageService == null) {
                    throw new ManuscriptParser.ImageUploadException(
                            "Image storage is temporarily unavailable. No chapters were imported.");
                }
                return chapterImageStorageService.uploadChapterImageBytes(bookId, originalName, imageBytes);
            };

            final ManuscriptParser.ParseResult parsed;
            try {
                parsed = parser.parseDetailed(filename, bytes, uploader);
            } catch (IllegalArgumentException invalidFile) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, invalidFile.getMessage());
            }

            List<Chapter> imported = new ArrayList<>();
            String importId = java.util.UUID.randomUUID().toString();

            for (ManuscriptParser.ImportedChapter source : parsed.chapters()) {
                Chapter chapter = new Chapter();
                chapter.setTitle(source.title());
                chapter.setContent(source.content());
                chapter.setStatus("draft");
                chapter.setImportBatchId(importId);
                chapter.updateWordCount();
                imported.add(chapter);
            }
            // Normalize only legacy explicit-null arrays. This predicate cannot
            // reset chapters appended concurrently by another session.
            mongo.updateFirst(Query.query(Criteria.where("_id").is(bookId).and("authorId").is(authorId).and("chapters").is(null)),
                    new Update().set("chapters", List.of()), Book.class);
            // Append to the current owned document; never save the metadata snapshot.
            // Autosaves, releases, counters and revisions remain untouched.
            Query append = Query.query(Criteria.where("_id").is(bookId).and("authorId").is(authorId));
            append.fields().include("_id").include("chapters.id");
            Book updated = mongo.findAndModify(append,
                    new Update().push("chapters").each(imported.toArray()).set("lastUpdatedAt", LocalDate.now()),
                    FindAndModifyOptions.options().returnNew(true), Book.class);
            if (updated == null) throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "The story changed or was removed during import. No chapters were imported; reopen the story and try again.");
            return new ImportResult(
                    parsed.chapters().size(), updated.getChapters() == null ? 0 : updated.getChapters().size(),
                    parsed.embeddedImages(), parsed.uploadedImages(), parsed.characterCandidates(), importId, imported.stream().map(Chapter::getId).toList());
        } finally {
            importDebounce.remove(debounceKey);
        }
    }
}
