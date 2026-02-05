-- Create the queue for applicant AI processing
SELECT pgmq.create('applicant_ai_processing');

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
