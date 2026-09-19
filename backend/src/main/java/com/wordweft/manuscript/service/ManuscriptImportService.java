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
    private static final int MAX_FILE_BYTES = 5 * 1024 * 1024;

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

    public record ImportResult(int importedChapters, int totalChapters) {}

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
                    HttpStatus.BAD_REQUEST, "Manuscripts must be 5 MB or smaller.");
        }

        String debounceKey = authorId + ":" + bookId;
        Long lastImport = importDebounce.get(debounceKey);
        long now = System.currentTimeMillis();
        if (lastImport != null && (now - lastImport) < 5000) {
            throw new ResponseStatusException(
                    HttpStatus.TOO_MANY_REQUESTS, "A manuscript import is already in progress. Please wait a few moments.");
        }
        importDebounce.put(debounceKey, now);

        ManuscriptParser.ImageUploader uploader = (imageBytes, originalName) -> {
            if (chapterImageStorageService != null) {
                return chapterImageStorageService.uploadChapterImageBytes(bookId, originalName, imageBytes);
            }
            return null;
        };

        final List<ManuscriptParser.ImportedChapter> imported;
        try {
            imported = parser.parse(filename, bytes, uploader);
        } catch (IllegalArgumentException invalidFile) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, invalidFile.getMessage());
        }

        if (book.getChapters() == null) {
            book.setChapters(new ArrayList<>());
        }

        for (ManuscriptParser.ImportedChapter source : imported) {
            Chapter chapter = new Chapter();
            chapter.setTitle(source.title());
            chapter.setContent(source.content());
            chapter.setStatus("draft");
            chapter.updateWordCount();
            book.getChapters().add(chapter);
        }
        book.setLastUpdatedAt(LocalDate.now());
        books.save(book);
        return new ImportResult(imported.size(), book.getChapters().size());
    }
}
