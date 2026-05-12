package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.sql.PreparedStatement;
import com.propertymanagement.modules.user.entity.User;

/**
 * Resets ALL user passwords to "Admin@1234" using BCryptPasswordEncoder at migration time,
 * guaranteeing the stored hash is correct regardless of any previous bad hash.
 */
public class V73__ResetAdminPassword extends BaseJavaMigration {

    @Override
    public void migrate(Context context) throws Exception {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(10);
        String hash = encoder.encode("Admin@1234");

        try (PreparedStatement stmt = context.getConnection().prepareStatement(
                "UPDATE property_mgmt.users SET password_hash = ?, is_active = TRUE WHERE TRUE")) {
            stmt.setString(1, hash);
            stmt.executeUpdate();
        }
    }
}
