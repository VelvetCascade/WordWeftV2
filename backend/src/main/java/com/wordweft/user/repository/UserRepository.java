
package com.wordweft.user.repository;

import com.wordweft.user.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    Optional<User> findByGoogleId(String googleId);

    Optional<User> findFirstByResetPasswordToken(String resetPasswordToken);

    @Query(value = "{'email': ?0}", fields = "{'username': 1, 'email': 1, 'password': 1, 'roles': 1}")
    Optional<User> findAuthenticationByEmail(String email);

    @Query(value = "{'username': ?0}", fields = "{'username': 1, 'email': 1, 'password': 1, 'roles': 1}")
    Optional<User> findAuthenticationByUsername(String username);

    @Query(value = "{'_id': ?0}", fields = "{'dateOfBirth': 1, 'allowMatureContent': 1}")
    Optional<User> findAccessPreferencesById(String userId);

    @Query(value = "{'_id': ?0}", fields = """
            {'username': 1, 'email': 1, 'avatarUrl': 1, 'bio': 1, 'location': 1, 'website': 1,
             'joinDate': 1, 'followers': 1, 'following': 1, 'socials': 1, 'favoriteGenres': 1,
             'roles': 1, 'communityInterests': 1, 'communityBadges': 1, 'hasSeenWritingDemo': 1,
             'dateOfBirth': 1, 'allowMatureContent': 1, 'notificationPreferences': 1, 'stats': 1, 'publicReadingStats': 1}
            """)
    Optional<User> findProfileById(String userId);

    @Query(value = "{'_id': ?0}", fields = """
            {'username': 1, 'avatarUrl': 1, 'bio': 1, 'location': 1, 'website': 1, 'joinDate': 1,
             'followers': 1, 'following': 1, 'socials': 1, 'favoriteGenres': 1,
             'communityInterests': 1, 'communityBadges': 1, 'stats': 1, 'publicReadingStats': 1}
            """)
    Optional<User> findPublicProfileById(String userId);

    @Query(value = "{'_id': ?0}", fields = "{'followers': 1}")
    Optional<User> findFollowersById(String userId);

    @Query(value = "{'_id': ?0}", fields = "{'following': 1}")
    Optional<User> findFollowingById(String userId);

    @Query(value = "{'_id': {'$in': ?0}}", fields = "{'username': 1, 'avatarUrl': 1, 'bio': 1}")
    List<User> findPublicCardsByIdIn(Collection<String> userIds);

    Boolean existsByUsername(String username);

    Boolean existsByEmail(String email);
}
