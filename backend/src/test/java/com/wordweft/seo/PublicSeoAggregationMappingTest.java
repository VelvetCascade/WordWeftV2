package com.wordweft.seo;

import com.wordweft.book.model.Book;
import org.bson.Document;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.*;
import org.springframework.data.mongodb.core.convert.*;
import org.springframework.data.mongodb.core.mapping.MongoMappingContext;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PublicSeoAggregationMappingTest {
    @Test void sitemapPipelinesUseStoredFieldsAndKeepPublishedContentGuards() {
        var conversions = MongoCustomConversions.create(adapter -> {});
        var mapping = new MongoMappingContext();
        mapping.setSimpleTypeHolder(conversions.getSimpleTypeHolder());
        var converter = new MappingMongoConverter(NoOpDbRefResolver.INSTANCE, mapping);
        converter.setCustomConversions(conversions);
        converter.afterPropertiesSet();
        // MongoTemplate's default (non-strict) aggregation uses this mapping context.
        var context = new RelaxedTypeBasedAggregationOperationContext(Book.class, mapping, new QueryMapper(converter));

        for (String kind : List.of("books", "chapters", "authors", "genres", "tags")) {
            MongoTemplate mongo = mock(MongoTemplate.class);
            when(mongo.aggregate(any(Aggregation.class), eq(Book.class), eq(Document.class)))
                    .thenReturn(new AggregationResults<>(List.of(), new Document()));
            new PublicSeoService(mongo, new com.wordweft.book.service.ChapterPreviewService()).sitemap(kind, 2);
            var capture = ArgumentCaptor.forClass(Aggregation.class);
            verify(mongo).aggregate(capture.capture(), eq(Book.class), eq(Document.class));
            List<Document> stages = assertDoesNotThrow(() -> capture.getValue().toPipeline(context), kind);
            Document guard = stages.get(0).get("$match", Document.class);
            assertEquals("published", guard.get("publicationStatus"));
            assertEquals(new Document("$ne", true), guard.get("isMature"));
            assertEquals(new Document("$elemMatch", new Document("status", "published")), guard.get("chapters"));
            assertEquals(new Document("$skip", 1000L), stages.get(stages.size() - 2));
            assertEquals(new Document("$limit", 1000L), stages.get(stages.size() - 1));
            if (kind.equals("chapters")) {
                Document projection = stages.stream().filter(stage -> stage.containsKey("$project")).findFirst().orElseThrow().get("$project", Document.class);
                assertEquals("$_id", projection.get("bookId"));
                assertEquals("$chapters._id", projection.get("chapterId"));
                assertTrue(stages.contains(new Document("$match", new Document("chapters.status", "published"))));
            }
        }
    }
}
