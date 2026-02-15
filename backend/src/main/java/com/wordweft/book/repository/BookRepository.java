
package com.wordweft.book.repository;

import com.wordweft.book.model.Book;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface BookRepository extends MongoRepository<Book, String> {
    List<Book> findByAuthorId(String authorId);
    List<Book> findByGenresContaining(String genre);
    List<Book> findByPublicationStatus(String status);
    List<Book> findByAuthorIdAndPublicationStatus(String authorId, String publicationStatus);
}
