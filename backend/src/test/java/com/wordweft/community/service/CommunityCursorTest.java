package com.wordweft.community.service;

import org.junit.jupiter.api.Test;
import java.time.Instant;
import static org.junit.jupiter.api.Assertions.*;

class CommunityCursorTest {
    @Test void roundTripsTupleWithoutLosingTimestampPrecision() {
        var cursor = new CommunityCursor(Instant.parse("2026-08-29T12:01:00.123Z"), "post-2");
        assertEquals(cursor, CommunityCursor.parse(cursor.encode()));
    }
    @Test void rejectsMalformedOrOversizedCursors() {
        assertThrows(IllegalArgumentException.class, () -> CommunityCursor.parse("not-a-cursor"));
        assertThrows(IllegalArgumentException.class, () -> CommunityCursor.parse("x".repeat(2048)));
        assertNull(CommunityCursor.parse(null));
    }
    @Test void compositeRelationshipIdsAreStableAndUnambiguous() {
        assertEquals(RelationshipId.of("a", "b"), RelationshipId.of("a", "b"));
        assertNotEquals(RelationshipId.of("ab", "c"), RelationshipId.of("a", "bc"));
        assertNotEquals(RelationshipId.of("a", "b"), RelationshipId.of("b", "a"));
    }
}
