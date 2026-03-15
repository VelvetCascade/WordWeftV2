
package com.wordweft.init;

import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Component
public class DataSeeder implements CommandLineRunner {

    @Autowired UserRepository userRepository;
    @Autowired BookRepository bookRepository;
    @Autowired PasswordEncoder encoder;

    @Override
    public void run(String... args) throws Exception {
        if (userRepository.count() == 0) {
            seedUsers();
        }
        if (bookRepository.count() == 0) {
            seedBooks();
        }
    }

    private void seedUsers() {
        User mainAuthor = new User("Elara Vance", "elara@wordweft.com", encoder.encode("password"));
        mainAuthor.setBio("Elara Vance is a celebrated author of speculative fiction, known for weaving intricate worlds and compelling characters.");
        userRepository.save(mainAuthor);

        User author2 = new User("Jaxson Reed", "jaxson@wordweft.com", encoder.encode("password"));
        author2.setBio("Jaxson Reed writes thrilling sci-fi adventures.");
        userRepository.save(author2);
    }

    private void seedBooks() {
        User elara = userRepository.findByUsername("Elara Vance").get();
        User jaxson = userRepository.findByUsername("Jaxson Reed").get();

        // Book 1
        Book b1 = new Book();
        b1.setTitle("The Obsidian Heart");
        b1.setAuthorId(elara.getId());
        b1.setCoverUrl("https://picsum.photos/seed/book1/400/600");
        b1.setRating(4.8);
        b1.setReviewsCount(1256);
        b1.setGenres(List.of("High Fantasy", "Adventure"));
        b1.setTags(List.of("Magic", "Dragons", "Quest"));
        b1.setSummary("In a world where magic is fading, a young scribe discovers an ancient artifact.");
        b1.setDescription("Full description here...");
        b1.setPublicationStatus("published");
        b1.setPublishedDate(LocalDate.of(2023, 1, 15));
        
        List<Chapter> c1 = new ArrayList<>();
        Chapter ch1 = new Chapter(); ch1.setTitle("The Whispering Archives"); ch1.setContent("The air in the Grand Archives..."); ch1.setStatus("published"); ch1.updateWordCount(); c1.add(ch1);
        Chapter ch2 = new Chapter(); ch2.setTitle("Shadows in the Sundial"); ch2.setContent("Following the cryptic map..."); ch2.setStatus("published"); ch2.updateWordCount(); c1.add(ch2);
        b1.setChapters(c1);
        bookRepository.save(b1);

        // Book 2
        Book b2 = new Book();
        b2.setTitle("Echoes of a Neon City");
        b2.setAuthorId(jaxson.getId());
        b2.setCoverUrl("https://picsum.photos/seed/book2/400/600");
        b2.setRating(4.5);
        b2.setReviewsCount(892);
        b2.setGenres(List.of("Cyberpunk", "Sci-Fi"));
        b2.setPublicationStatus("published");
        b2.setPublishedDate(LocalDate.of(2022, 11, 30));
        b2.setMature(true);
        b2.setAIGenerated(true);
        
        List<Chapter> c2 = new ArrayList<>();
        Chapter ch3 = new Chapter(); ch3.setTitle("Neon Rain"); ch3.setContent("The rain tasted like acid..."); ch3.setStatus("published"); ch3.updateWordCount(); c2.add(ch3);
        b2.setChapters(c2);
        bookRepository.save(b2);
    }
}
