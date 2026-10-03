
package com.wordweft.book.repository;

import com.wordweft.book.model.Book;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface BookRepository extends MongoRepository<Book, String> {
    List<Book> findByAuthorId(String authorId);
    List<Book> findByGenresContaining(String genre);
    List<Book> findByPublicationStatus(String status);
    List<Book> findByAuthorIdAndPublicationStatus(String authorId, String publicationStatus);

    @Query(value = "{'_id': ?0}", fields = "{'_id': 1, 'chapters.id': 1, 'chapters.status': 1}")
    Optional<Book> findProgressMetadataById(String id);

    @Query(value = "{'_id': {$in: ?0}}", fields = "{'_id': 1, 'chapters.id': 1, 'chapters.status': 1}")
    List<Book> findProgressMetadataByIdIn(Collection<String> ids);

    @Query(value = "{'authorId': ?0}", fields = "{'chapters.content': 0, 'chapters.publishedContent': 0}")
    List<Book> findAnalyticsMetadataByAuthorId(String authorId);

    @Query(value = "{'_id': ?0}", fields = "{'chapters.content': 0, 'chapters.publishedContent': 0}")
    Optional<Book> findAnalyticsMetadataById(String id);

    @Query("{'chapters': {$elemMatch: {'status': 'scheduled', 'scheduledAt': {$lte: ?0}}}}")
    List<Book> findBooksWithDueChapters(Instant now);
}
