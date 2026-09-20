package com.wordweft.book.service;

import com.wordweft.book.dto.ChapterContentResponse;
import com.wordweft.book.model.AgeRating;
import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.exception.AuthRequiredException;
import com.wordweft.exception.ContentRestrictedException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.ResponseStatus;

import java.util.List;
import java.util.Objects;

import static com.wordweft.book.dto.ChapterContentResponse.ChapterAccess.FULL;
import static com.wordweft.book.dto.ChapterContentResponse.ChapterAccess.PREVIEW;

@Service
public class ChapterContentService {

    private final BookRepository bookRepository;
    private final ContentAccessService contentAccessService;
    private final ChapterPreviewService chapterPreviewService;

    @Value("${wordweft.reader-sign-in-gate-enabled:true}")
    private boolean readerSignInGateEnabled = true;

    public ChapterContentService(
            BookRepository bookRepository,
            ContentAccessService contentAccessService,
            ChapterPreviewService chapterPreviewService) {
        this.bookRepository = bookRepository;
        this.contentAccessService = contentAccessService;
        this.chapterPreviewService = chapterPreviewService;
    }

    public ChapterContentResponse load(String bookId, String chapterId) {
        Book book = bookRepository.findById(bookId).orElseThrow(ContentNotFoundException::new);
        String currentUserId = contentAccessService.currentUserId();
        boolean owner = currentUserId != null && currentUserId.equals(book.getAuthorId());

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

        if (currentUserId == null && readerSignInGateEnabled) {
            if (chapterIndex != 0) {
                throw new AuthRequiredException();
            }
            return response(book, chapter, publicChapter, chapterIndex, PREVIEW, preview.html(), preview);
        }

        return response(book, chapter, publicChapter, chapterIndex, FULL, fullContent, preview);
    }

    private ChapterContentResponse response(
            Book book,
            Chapter chapter,
            PublishedChapterView.Snapshot publicChapter,
            int chapterIndex,
            ChapterContentResponse.ChapterAccess access,
            String content,
            ChapterPreviewService.Preview preview) {
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
                preview.fullWordCount());
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
