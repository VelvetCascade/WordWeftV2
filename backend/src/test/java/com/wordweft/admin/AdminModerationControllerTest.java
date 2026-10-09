package com.wordweft.admin;

import com.wordweft.book.model.Book;
import com.wordweft.community.model.CommunityModerationEvent;
import com.wordweft.security.services.UserDetailsImpl;
import com.wordweft.user.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AdminModerationControllerTest {
    private final MongoTemplate mongo = mock(MongoTemplate.class);
    private final AdminModerationController controller = new AdminModerationController(mongo);
    private final UserDetailsImpl admin = new UserDetailsImpl("admin", "admin",
            "admin@example.test", "secret", List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));

    @Test void adminsCannotSuspendThemselvesOrOtherAdministrators() {
        var request = new AdminModerationController.Decision("SUSPEND", "Verified policy violation", "", null);
        assertThrows(ResponseStatusException.class, () -> controller.user("admin", request, admin));
        User otherAdmin = new User("other", "other@example.test", "hash");
        otherAdmin.setId("other");
        otherAdmin.setRoles(Set.of("ROLE_ADMIN", "ROLE_USER"));
        when(mongo.findById("other", User.class)).thenReturn(otherAdmin);
        assertThrows(ResponseStatusException.class, () -> controller.user("other", request, admin));
        verify(mongo, never()).findAndModify(any(Query.class), any(Update.class),
                any(FindAndModifyOptions.class), eq(User.class));
    }

    @Test void suspendingRegularMemberIsReversibleAndAuditedInMongo() {
        User target = new User("writer", "writer@example.test", "hash");
        target.setId("writer");
        when(mongo.findById("writer", User.class)).thenReturn(target);
        target.setSuspended(true);
        when(mongo.findAndModify(any(Query.class), any(Update.class),
                any(FindAndModifyOptions.class), eq(User.class))).thenReturn(target);
        when(mongo.insert(any(CommunityModerationEvent.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        var result = controller.user("writer",
                new AdminModerationController.Decision("SUSPEND", "Repeated policy violations", "Please contact support", null),
                admin).getBody();
        assertNotNull(result);
        assertEquals("SUSPENDED", result.state());
        assertTrue(result.auditRecorded());
        verify(mongo).insert(any(CommunityModerationEvent.class));
    }

    @Test void restoringStoryDoesNotDeleteOrRewriteManuscript() {
        Book book = new Book();
        book.setId("story");
        book.setTitle("The Story");
        book.setAuthorId("writer");
        book.setModerationRemoved(true);
        when(mongo.findById("story", Book.class)).thenReturn(book);
        when(mongo.findAndModify(any(Query.class), any(Update.class),
                any(FindAndModifyOptions.class), eq(Book.class))).thenReturn(book);
        when(mongo.insert(any(CommunityModerationEvent.class))).thenAnswer(i -> i.getArgument(0));
        var result = controller.book("story",
                new AdminModerationController.Decision("RESTORE", "Appeal accepted following review", "", null),
                admin).getBody();
        assertEquals("AVAILABLE", result.state());
        verify(mongo, never()).remove(any(Query.class), eq(Book.class));
    }

}
