package com.wordweft.analytics.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.Instant;

@Data
@Document(collection = "platform_analytics_events")
public class PlatformEvent {
    @Id private String id;
    @Indexed(expireAfterSeconds = 7776000)
    private Instant createdAt = Instant.now();
    private String category;
    private String action;
    private String pagePath;
    private String deviceType;
    private String browser;
    private String os;
}
