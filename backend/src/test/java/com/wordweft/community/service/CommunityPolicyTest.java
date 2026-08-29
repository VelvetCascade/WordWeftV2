package com.wordweft.community.service;

import com.wordweft.community.dto.CommunityDtos.CreatePostRequest;
import com.wordweft.community.model.CommunityEnums.PostType;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class CommunityPolicyTest {
    private final CommunityPolicy policy = new CommunityPolicy();

    @Test
    void rejectsBlankPostBodies() {
        CreatePostRequest request = request(PostType.UPDATE, null, "   ", List.of());

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> policy.validatePost(request));

        assertEquals("Write something before publishing.", error.getMessage());
    }

    @Test
    void requiresTitlesForStructuredPostTypes() {
        for (PostType type : List.of(PostType.RELEASE, PostType.POLL, PostType.WORKSHOP)) {
            CreatePostRequest request = request(type, null, "Useful body", List.of("One", "Two"));
            assertThrows(IllegalArgumentException.class, () -> policy.validatePost(request), type.name());
        }
    }

    @Test
    void normalizesPollOptionsAndRejectsDuplicates() {
        assertEquals(List.of("North", "South"),
                policy.normalizePollOptions(List.of(" North ", "South")));

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> policy.normalizePollOptions(List.of("North", " north ")));
        assertEquals("Poll choices must be unique.", error.getMessage());
    }

    @Test
    void acceptsTwoToSixPollOptionsOnly() {
        assertThrows(IllegalArgumentException.class,
                () -> policy.normalizePollOptions(List.of("Only one")));
        assertThrows(IllegalArgumentException.class,
                () -> policy.normalizePollOptions(List.of("1", "2", "3", "4", "5", "6", "7")));
        assertEquals(6, policy.normalizePollOptions(List.of("1", "2", "3", "4", "5", "6")).size());
    }

    @Test
    void trimsValidCommentsAndRejectsOversizedComments() {
        assertEquals("Thoughtful reply", policy.validateComment("  Thoughtful reply  "));
        assertThrows(IllegalArgumentException.class, () -> policy.validateComment("x".repeat(2001)));
    }

    private CreatePostRequest request(PostType type, String title, String body, List<String> pollOptions) {
        CreatePostRequest request = new CreatePostRequest();
        request.setCircleId("general");
        request.setType(type);
        request.setTitle(title);
        request.setBody(body);
        request.setPollOptions(pollOptions);
        return request;
    }
}
