package com.wordweft.search.service;

import com.wordweft.book.model.AgeRating;
import com.wordweft.book.model.Book;
import com.wordweft.book.service.ContentAccessService;
import org.bson.Document;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.*;
import org.springframework.data.mongodb.core.convert.*;
import org.springframework.data.mongodb.core.mapping.MongoMappingContext;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Atlas itself is unavailable on standalone Mongo; verify the mapped fuzzy pipeline contract. */
class SearchAtlasPipelineTest {
    @Test void fuzzyBooksApplyTheSameVisibilityBeforeTotalAndPageAndKeepAtlasTextSettings() {
        MongoTemplate mongo = mock(MongoTemplate.class);
        ContentAccessService access = mock(ContentAccessService.class);
        when(access.allowedRatings()).thenReturn(Set.of(AgeRating.ALL_AGES, AgeRating.TEEN_13));
        SearchService service = new SearchService();
        ReflectionTestUtils.setField(service, "mongoTemplate", mongo);
        ReflectionTestUtils.setField(service, "contentAccessService", access);
        var conversions = MongoCustomConversions.create(adapter -> {});
        var mapping = new MongoMappingContext(); mapping.setSimpleTypeHolder(conversions.getSimpleTypeHolder());
        var converter = new MappingMongoConverter(NoOpDbRefResolver.INSTANCE, mapping);
        converter.setCustomConversions(conversions); converter.afterPropertiesSet();
        var context = new RelaxedTypeBasedAggregationOperationContext(Book.class, mapping, new QueryMapper(converter));
        List<List<Document>> pipelines = new ArrayList<>();
        when(mongo.aggregate(any(Aggregation.class), eq(Book.class), eq(Document.class))).thenAnswer(invocation -> {
            List<Document> stages = ((Aggregation) invocation.getArgument(0)).toPipeline(context);
            pipelines.add(stages);
            List<Document> rows = stages.stream().anyMatch(stage -> stage.containsKey("$count"))
                    ? List.of(new Document("total", 16L))
                    : List.of(new Document("id", "fuzzy-story").append("title", "Matched story").append("score", 2.0));
            return new AggregationResults<>(rows, new Document());
        });

        @SuppressWarnings("unchecked") Map<String, Object> books = (Map<String, Object>) service.fullSearch("typod", "books", 1, 12).get("books");

        assertEquals(16L, books.get("total"));
        assertEquals("fuzzy-story", ((Map<?, ?>) ((List<?>) books.get("items")).get(0)).get("id"));
        assertEquals(2, pipelines.size());
        Document guard = pipelines.get(0).get(1).get("$match", Document.class);
        assertEquals(guard, pipelines.get(1).get(1).get("$match", Document.class));
        String guardJson = guard.toJson();
        assertTrue(guardJson.contains("published")); assertTrue(guardJson.contains("ageRating"));
        assertTrue(guardJson.contains("isMature")); assertTrue(guardJson.contains("chapters.contentWarnings"));
        assertTrue(guardJson.contains("SELF_HARM"));
        assertEquals(new Document("$count", "total"), pipelines.get(0).get(2));
        assertEquals(new Document("$skip", 12L), pipelines.get(1).get(2));
        assertEquals(new Document("$limit", 12L), pipelines.get(1).get(3));
        Document search = pipelines.get(1).get(0).get("$search", Document.class);
        assertEquals("booksSearchIndex", search.getString("index"));
        Document text = search.get("compound", Document.class).getList("must", Document.class).get(0).get("text", Document.class);
        assertEquals(new Document("maxEdits", 1).append("prefixLength", 2), text.get("fuzzy"));
        assertEquals(List.of("title", "summary", "genres", "tags", "description"), text.get("path"));
        Document projection = pipelines.get(1).get(4).get("$project", Document.class);
        assertFalse(projection.containsKey("chapters")); assertFalse(projection.containsKey("content"));
        verify(access, times(1)).allowedRatings();
    }
}
