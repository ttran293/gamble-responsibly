-- Demo contacts are saved without sending an email or granting an active link.
ALTER TABLE emergency_contact_requests
  DROP CONSTRAINT IF EXISTS emergency_contact_requests_status_check;

ALTER TABLE emergency_contact_requests
  ADD CONSTRAINT emergency_contact_requests_status_check
  CHECK (status IN ('pending', 'accepted', 'superseded', 'demo'));
