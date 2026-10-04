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
            List<String> characterCandidates) {}

    public ImportResult importManuscript(
            String authorId, String bookId, String filename, byte[] bytes) {
        Book book = books.findAnalyticsMetadataById(bookId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Story not found."));
        if (!authorId.equals(book.getAuthorId())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "You do not have permission to edit this story.");
        }
        if (bytes == null || bytes.length > MAX_FILE_BYTES) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Manuscripts must be 25 MB or smaller.");
        }

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

            for (ManuscriptParser.ImportedChapter source : parsed.chapters()) {
                Chapter chapter = new Chapter();
                chapter.setTitle(source.title());
                chapter.setContent(source.content());
                chapter.setStatus("draft");
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
                    parsed.embeddedImages(), parsed.uploadedImages(), parsed.characterCandidates());
        } finally {
            importDebounce.remove(debounceKey);
        }
    }
}
