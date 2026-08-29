package com.wordweft.community.service;

import com.wordweft.community.dto.CommunityDtos.*;
import com.wordweft.community.model.CommunityEnums.*;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

@Service
@RequiredArgsConstructor
public class CommunityIdentityService {
    private final CommunityAccess access;
    private final CommunityMapper mapper;
    private final UserRepository users;
    private final MongoTemplate mongo;
    private final CommunityService writes;

    public MeView me(String userId) {
        var viewer = access.viewer(userId); access.requireMember(viewer);
        return new MeView(viewer.interests(), viewer.badges(), viewer.canModerate(), viewer.canAdmin(), new ArrayList<>(mapper.joinedIds(userId)));
    }
    public MeView interests(String userId, Set<CommunityInterest> interests) {
        access.requireMember(access.viewer(userId));
        if (interests == null || interests.size() > 5 || interests.stream().anyMatch(Objects::isNull)) throw new IllegalArgumentException("Choose valid community interests.");
        mongo.updateFirst(Query.query(Criteria.where("_id").is(userId)), new Update().set("communityInterests", interests), User.class);
        return me(userId);
    }
    public AuthorSummary badges(String actorId, String userId, Set<CommunityBadge> badges) {
        var actor = access.viewer(actorId); access.requireMember(actor);
        if (!actor.canAdmin()) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only administrators can assign trust badges.");
        if (badges == null || badges.size() > 3 || badges.stream().anyMatch(Objects::isNull)) throw new IllegalArgumentException("Choose valid community badges.");
        User user = users.findById(userId).orElseThrow(CommunityService::notFound);
        mongo.updateFirst(Query.query(Criteria.where("_id").is(userId)), new Update().set("communityBadges", badges), User.class);
        writes.audit(actorId, "USER", userId, "SET_BADGES", badges.toString());
        user.setCommunityBadges(badges); return mapper.author(user, userId, actor);
    }
}
