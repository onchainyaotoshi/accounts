-- AlterTable: Fix foreign key constraints to match Prisma schema (CASCADE instead of RESTRICT)

-- invite_code_usages.invite_code_id: RESTRICT → CASCADE
ALTER TABLE "invite_code_usages" DROP CONSTRAINT "invite_code_usages_invite_code_id_fkey";
ALTER TABLE "invite_code_usages" ADD CONSTRAINT "invite_code_usages_invite_code_id_fkey" FOREIGN KEY ("invite_code_id") REFERENCES "invite_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- invite_code_usages.used_by_user_id: RESTRICT → CASCADE
ALTER TABLE "invite_code_usages" DROP CONSTRAINT "invite_code_usages_used_by_user_id_fkey";
ALTER TABLE "invite_code_usages" ADD CONSTRAINT "invite_code_usages_used_by_user_id_fkey" FOREIGN KEY ("used_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- auth_codes.user_id: RESTRICT → CASCADE
ALTER TABLE "auth_codes" DROP CONSTRAINT "auth_codes_user_id_fkey";
ALTER TABLE "auth_codes" ADD CONSTRAINT "auth_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- auth_codes.client_id: RESTRICT → CASCADE
ALTER TABLE "auth_codes" DROP CONSTRAINT "auth_codes_client_id_fkey";
ALTER TABLE "auth_codes" ADD CONSTRAINT "auth_codes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- sessions.user_id: RESTRICT → CASCADE
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_user_id_fkey";
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- password_reset_tokens.user_id: RESTRICT → CASCADE
ALTER TABLE "password_reset_tokens" DROP CONSTRAINT "password_reset_tokens_user_id_fkey";
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
