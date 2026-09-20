package com.wordweft.book.service;

import com.wordweft.book.dto.ChapterContentResponse;
import com.wordweft.book.model.AgeRating;
import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.exception.AuthRequiredException;
import com.wordweft.exception.ContentRestrictedException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Objects;

import static com.wordweft.book.dto.ChapterContentResponse.ChapterAccess.FULL;
import static com.wordweft.book.dto.ChapterContentResponse.ChapterAccess.PREVIEW;

@Service
public class ChapterContentService {

    private final BookRepository bookRepository;
    private final ContentAccessService contentAccessService;
    private final ChapterPreviewService chapterPreviewService;
    private final FontObfuscationService fontObfuscationService;

    @Value("${wordweft.reader-sign-in-gate-enabled:true}")
    private boolean readerSignInGateEnabled = true;

    @Autowired
    public ChapterContentService(
            BookRepository bookRepository,
            ContentAccessService contentAccessService,
            ChapterPreviewService chapterPreviewService,
            @Nullable FontObfuscationService fontObfuscationService) {
        this.bookRepository = bookRepository;
        this.contentAccessService = contentAccessService;
        this.chapterPreviewService = chapterPreviewService;
        this.fontObfuscationService = fontObfuscationService != null ? fontObfuscationService : new FontObfuscationService();
    }

    public ChapterContentService(
            BookRepository bookRepository,
            ContentAccessService contentAccessService,
            ChapterPreviewService chapterPreviewService) {
        this(bookRepository, contentAccessService, chapterPreviewService, null);
    }

    public ChapterContentResponse load(String bookId, String chapterId) {
        return load(bookId, chapterId, "read");
    }

    public ChapterContentResponse load(String bookId, String chapterId, String mode) {
        Book book = bookRepository.findById(bookId).orElseThrow(ContentNotFoundException::new);
        String currentUserId = contentAccessService.currentUserId();
        boolean owner = currentUserId != null && currentUserId.equals(book.getAuthorId());
        boolean isEditMode = "edit".equalsIgnoreCase(mode);

        if (isEditMode && !owner) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the author can access editable chapter content.");
        }

        if (!owner && !"published".equals(book.getPublicationStatus())) {
            throw new ContentNotFoundException();
        }
        if (!contentAccessService.canAccess(book)) {
            AgeRating rating = contentAccessService.effectiveRating(book);
            throw new ContentRestrictedException(
                    "This story is rated " + rating.getMinimumAge()
                            + "+. Sign in and enable mature content in your profile if you are eligible.");
        }

        List<Chapter> allChapters = Objects.requireNonNullElse(book.getChapters(), List.of());
        List<Chapter> visibleChapters = owner
                ? allChapters
                : allChapters.stream().filter(chapter -> "published".equals(chapter.getStatus())).toList();
        int chapterIndex = indexOf(visibleChapters, chapterId);
        if (chapterIndex < 0) {
            throw new ContentNotFoundException();
        }

        Chapter chapter = visibleChapters.get(chapterIndex);
        PublishedChapterView.Snapshot publicChapter = owner ? null : PublishedChapterView.of(chapter);
        if (!owner) {
            AgeRating chapterRating = ContentAccessService.requiredRatingForWarnings(publicChapter.contentWarnings());
            if (!contentAccessService.allowedRatings().contains(chapterRating)) {
                throw new ContentRestrictedException(
                        "This chapter contains mature content (" + chapterRating.getMinimumAge()
                                + "+). Sign in and enable mature content in your profile if you are eligible.");
            }
        }
        String fullContent = owner
                ? Objects.requireNonNullElse(chapter.getContent(), "")
                : publicChapter.content();
        ChapterPreviewService.Preview preview = chapterPreviewService.preview(fullContent);

        // Edit mode: Author always gets pristine, un-obfuscated content
        if (isEditMode) {
            return response(book, chapter, publicChapter, chapterIndex, FULL, fullContent, preview, false, null, null);
        }

        // Reader mode: Check sign-in gate
        if (currentUserId == null && readerSignInGateEnabled) {
            if (chapterIndex != 0) {
                throw new AuthRequiredException();
            }
            String seed = fontObfuscationService.getSeedForChapter(bookId, chapterId);
            String obfuscatedPreview = fontObfuscationService.obfuscateHtml(preview.html(), seed);
            return response(book, chapter, publicChapter, chapterIndex, PREVIEW, obfuscatedPreview, preview, true, seed, "WW-Cipher-" + seed);
        }

        // Reader mode: Authenticated reader gets obfuscated full content
        String seed = fontObfuscationService.getSeedForChapter(bookId, chapterId);
        String obfuscatedContent = fontObfuscationService.obfuscateHtml(fullContent, seed);
        return response(book, chapter, publicChapter, chapterIndex, FULL, obfuscatedContent, preview, true, seed, "WW-Cipher-" + seed);
    }

    private ChapterContentResponse response(
            Book book,
            Chapter chapter,
            PublishedChapterView.Snapshot publicChapter,
            int chapterIndex,
            ChapterContentResponse.ChapterAccess access,
            String content,
            ChapterPreviewService.Preview preview,
            boolean obfuscated,
            String obfuscationSeed,
            String fontFamily) {
        return new ChapterContentResponse(
                book.getId(),
                Objects.requireNonNullElse(book.getTitle(), ""),
                chapter.getId(),
                publicChapter == null
                        ? Objects.requireNonNullElse(chapter.getTitle(), "")
                        : publicChapter.title(),
                chapterIndex,
                access,
                content,
                access == PREVIEW ? preview.previewWordCount() : preview.fullWordCount(),
                preview.fullWordCount(),
                obfuscated,
                obfuscationSeed,
                fontFamily);
    }

    private int indexOf(List<Chapter> chapters, String chapterId) {
        for (int index = 0; index < chapters.size(); index++) {
            if (Objects.equals(chapters.get(index).getId(), chapterId)) {
                return index;
            }
        }
        return -1;
    }

    @ResponseStatus(HttpStatus.NOT_FOUND)
    public static class ContentNotFoundException extends RuntimeException {
        public ContentNotFoundException() {
            super("Story or chapter not found.");
        }
    }
}
