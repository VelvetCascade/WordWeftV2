package com.wordweft.config;

import com.wordweft.book.repository.BookRepository;
import com.wordweft.book.service.ChapterPublishingService;
import com.wordweft.book.service.ScheduledChapterPublisher;
import com.wordweft.manuscript.repository.ChapterRevisionRepository;
import com.wordweft.manuscript.service.ChapterRevisionService;
import com.wordweft.notification.service.NotificationService;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;

class ClockBackedServiceWiringTest {

    @Test
    void springCanSelectTheProductionConstructorsForClockBackedServices() {
        try (AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext()) {
            context.getBeanFactory().registerSingleton("bookRepository", mock(BookRepository.class));
            context.getBeanFactory().registerSingleton("notificationService", mock(NotificationService.class));
            context.getBeanFactory().registerSingleton("chapterRevisionRepository", mock(ChapterRevisionRepository.class));
            context.register(ChapterPublishingService.class);
            context.register(ScheduledChapterPublisher.class);
            context.register(ChapterRevisionService.class);

            context.refresh();

            assertNotNull(context.getBean(ChapterPublishingService.class));
            assertNotNull(context.getBean(ScheduledChapterPublisher.class));
            assertNotNull(context.getBean(ChapterRevisionService.class));
        }
    }
}
