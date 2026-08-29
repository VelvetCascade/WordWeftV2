package com.wordweft.community.model;

import com.wordweft.community.model.CommunityEnums.PostType;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@Document(collection = "community_circles")
public class CommunityCircle {
    @Id private String id;
    @Indexed(unique = true) private String slug;
    private String name;
    private String description;
    private List<String> rules = new ArrayList<>();
    private String accent = "#8D6E63";
    private List<PostType> allowedPostTypes = new ArrayList<>();
    private long memberCount = 0;
    private boolean official = false;
    @Indexed private boolean active = true;
    private Instant createdAt = Instant.now();
    private Instant updatedAt = Instant.now();
}
