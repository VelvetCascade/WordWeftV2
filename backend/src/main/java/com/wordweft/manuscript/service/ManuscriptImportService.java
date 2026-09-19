package com.wordweft.manuscript.service;

import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.book.service.ChapterImageStorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
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
    private final ChapterImageStorageService chapterImageStorageService;
    private final ConcurrentHashMap<String, Long> importDebounce = new ConcurrentHashMap<>();

    @Autowired
    public ManuscriptImportService(
            BookRepository books,
            ManuscriptParser parser,
            @org.springframework.lang.Nullable ChapterImageStorageService chapterImageStorageService) {
        this.books = books;
        this.parser = parser;
        this.chapterImageStorageService = chapterImageStorageService;
    }

    public ManuscriptImportService(BookRepository books, ManuscriptParser parser) {
        this(books, parser, null);
    }

    public record ImportResult(
            int importedChapters,
            int totalChapters,
            int embeddedImages,
            int uploadedImages,
            List<String> characterCandidates) {}

    public ImportResult importManuscript(
            String authorId, String bookId, String filename, byte[] bytes) {
        Book book = books.findById(bookId)
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

            if (book.getChapters() == null) {
                book.setChapters(new ArrayList<>());
            }

            for (ManuscriptParser.ImportedChapter source : parsed.chapters()) {
                Chapter chapter = new Chapter();
                chapter.setTitle(source.title());
                chapter.setContent(source.content());
                chapter.setStatus("draft");
                chapter.updateWordCount();
                book.getChapters().add(chapter);
            }
            book.setLastUpdatedAt(LocalDate.now());
            books.save(book);
            return new ImportResult(
                    parsed.chapters().size(), book.getChapters().size(),
                    parsed.embeddedImages(), parsed.uploadedImages(), parsed.characterCandidates());
        } finally {
            importDebounce.remove(debounceKey);
        }
    }
}
