-- Add columns for AI applicant scoring
ALTER TABLE "public"."Mieter" 
ADD COLUMN "bewerbung_score" numeric,
ADD COLUMN "bewerbung_mail_id" uuid REFERENCES "public"."Mail_Metadaten"("id") ON DELETE SET NULL,
ADD COLUMN "bewerbung_metadaten" jsonb;

COMMENT ON COLUMN "public"."Mieter"."bewerbung_score" IS '0-100 score for applicant ranking';
COMMENT ON COLUMN "public"."Mieter"."bewerbung_mail_id" IS 'Reference to the original application email';
COMMENT ON COLUMN "public"."Mieter"."bewerbung_metadaten" IS 'AI analysis metadata including warnings, summary, and reasons';
