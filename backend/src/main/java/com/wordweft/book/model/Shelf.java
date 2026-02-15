package com.wordweft.book.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@Document(collection = "shelves")
public class Shelf {
    @Id
    private String id;

    @Indexed
    private String userId;

    private String name;

    private LocalDate createdDate = LocalDate.now();

    public Shelf(String userId, String name) {
        this.userId = userId;
        this.name = name;
        this.createdDate = LocalDate.now();
    }
}
