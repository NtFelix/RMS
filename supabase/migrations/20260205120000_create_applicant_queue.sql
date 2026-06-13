-- Create the queue for applicant AI processing if it doesn't exist
DO $$
BEGIN
   IF NOT EXISTS (
       SELECT 1 
       FROM pgmq.list_queues() 
       WHERE queue_name = 'applicant_ai_processing'
   ) THEN
      PERFORM pgmq.create('applicant_ai_processing');
   END IF;
END $$;

-- Wrapper function for pgmq.send to be callable from Supabase client
CREATE OR REPLACE FUNCTION pgmq_send(
    queue_name TEXT,
    message JSONB,
    delay INTEGER DEFAULT 0
)
RETURNS SETOF BIGINT AS $$
BEGIN
    RETURN QUERY SELECT * FROM pgmq.send(queue_name, message, delay);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION pgmq_send(TEXT, JSONB, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pgmq_send(TEXT, JSONB, INTEGER) TO authenticated, service_role;

-- Wrapper function for pgmq.read
CREATE OR REPLACE FUNCTION pgmq_read(
    queue_name TEXT,
    vt INTEGER,
    qty INTEGER
)
RETURNS SETOF pgmq.message_record AS $$
BEGIN
    RETURN QUERY SELECT * FROM pgmq.read(queue_name, vt, qty);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION pgmq_read(TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pgmq_read(TEXT, INTEGER, INTEGER) TO service_role;

-- Wrapper function for pgmq.delete
CREATE OR REPLACE FUNCTION pgmq_delete(
    queue_name TEXT,
    msg_id BIGINT
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN pgmq.delete(queue_name, msg_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION pgmq_delete(TEXT, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pgmq_delete(TEXT, BIGINT) TO service_role;
