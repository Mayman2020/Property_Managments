package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.sql.PreparedStatement;

public class V74__SetPasswordsTo12345 extends BaseJavaMigration {

    @Override
    public void migrate(Context context) throws Exception {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(10);
        String hash = encoder.encode("12345");

        try (PreparedStatement stmt = context.getConnection().prepareStatement(
                "UPDATE property_mgmt.users SET password_hash = ?, is_active = TRUE WHERE TRUE")) {
            stmt.setString(1, hash);
            stmt.executeUpdate();
        }
    }
}
