package com.wordweft.community.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/** A deterministic primary key makes inserts unique even before secondary indexes are ready. */
public final class RelationshipId {
    private RelationshipId() {}
    public static String of(String... parts) {
        StringBuilder key = new StringBuilder();
        for (String part : parts) key.append(part.length()).append(':').append(part);
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(key.toString().getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
    }
}
