package com.wordweft.community.service;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class CommunityQuotaTest {
    @Test void atomicallyReservesQuotaAndRejectsExhaustedKey() {
        MongoTemplate mongo = mock(MongoTemplate.class);
        CommunityQuota quota = new CommunityQuota(mongo);
        when(mongo.findAndModify(any(), any(), any(), eq(CommunityQuota.Bucket.class)))
                .thenThrow(new DuplicateKeyException("existing exhausted bucket"));
        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> quota.reserve("reader", "POST", 12));
        assertEquals(429, error.getStatusCode().value());
    }
}
