package com.wordweft.book.service;

import com.wordweft.analytics.repository.ChapterReadEventRepository;
import com.wordweft.book.model.ReadingProgress;
import com.wordweft.book.repository.CommentRepository;
import com.wordweft.book.repository.ReadingProgressRepository;
import com.wordweft.manuscript.repository.ChapterRevisionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class BookServiceChapterDeletionTest {

    @Test
    void deletionCleansChapterRecordsAndRepairsReaderProgress() {
        BookService service = new BookService();
        CommentRepository comments = mock(CommentRepository.class);
        ChapterRevisionRepository revisions = mock(ChapterRevisionRepository.class);
        ChapterReadEventRepository events = mock(ChapterReadEventRepository.class);
        ReadingProgressRepository progressRepository = mock(ReadingProgressRepository.class);
        ReflectionTestUtils.setField(service, "commentRepository", comments);
        ReflectionTestUtils.setField(service, "chapterRevisionRepository", revisions);
        ReflectionTestUtils.setField(service, "chapterReadEventRepository", events);
        ReflectionTestUtils.setField(service, "readingProgressRepository", progressRepository);

        ReadingProgress progress = new ReadingProgress();
        progress.setBookId("book-1");
        progress.setLastReadChapterIndex(1);
        progress.setLastReadScrollPosition(320);
        ReadingProgress.ChapterProgressItem deleted = new ReadingProgress.ChapterProgressItem();
        deleted.setProgress(100);
        ReadingProgress.ChapterProgressItem remaining = new ReadingProgress.ChapterProgressItem();
        remaining.setProgress(50);
        progress.setChapters(new HashMap<>(Map.of("chapter-1", deleted, "chapter-2", remaining)));
        progress.setCompletedChapterIds(new HashSet<>(List.of("chapter-1")));
        when(progressRepository.findByBookId("book-1")).thenReturn(List.of(progress));

        service.deleteChapterData("book-1", "chapter-1", 0, 1);

        verify(comments).deleteByChapterId("chapter-1");
        verify(revisions).deleteByChapterId("chapter-1");
        verify(events).deleteByChapterId("chapter-1");
        verify(progressRepository).saveAll(List.of(progress));
        assertFalse(progress.getChapters().containsKey("chapter-1"));
        assertFalse(progress.getCompletedChapterIds().contains("chapter-1"));
        assertEquals(0, progress.getLastReadChapterIndex());
        assertEquals(320, progress.getLastReadScrollPosition());
        assertEquals(50, progress.getOverallProgress());
    }
}
