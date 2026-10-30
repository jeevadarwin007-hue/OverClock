BEGIN;

-- Internal non-login identity used only as the audited actor for scoped dispatch.
INSERT INTO users (email, full_name, role, password_hash, is_available, max_concurrent_workload, active_workload_count)
VALUES ('campusops-automation@internal.local', 'CampusOps Automation', 'AI_AUTOMATION', NULL, FALSE, 0, 0)
ON CONFLICT (email) DO NOTHING;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM users
        WHERE email = 'campusops-automation@internal.local'
          AND role = 'AI_AUTOMATION'::user_role
          AND password_hash IS NULL
    ) THEN
        RAISE EXCEPTION 'Reserved CampusOps automation identity exists with an unexpected role or login credential';
    END IF;
END;
$$;

INSERT INTO fsm_state_transitions (from_state, to_state, allowed_roles)
VALUES (
    'TRIAGED',
    'ASSIGNED',
    ARRAY['SYS_ADMIN'::user_role, 'FACILITIES_ADMIN'::user_role, 'DEPT_MANAGER'::user_role, 'AI_AUTOMATION'::user_role]
)
ON CONFLICT (from_state, to_state) DO UPDATE
SET allowed_roles = CASE
    WHEN 'AI_AUTOMATION'::user_role = ANY(fsm_state_transitions.allowed_roles)
        THEN fsm_state_transitions.allowed_roles
    ELSE array_append(fsm_state_transitions.allowed_roles, 'AI_AUTOMATION'::user_role)
END;

CREATE OR REPLACE FUNCTION trg_fn_scope_ai_automation_assignment()
RETURNS TRIGGER AS $$
DECLARE
    v_role user_role;
BEGIN
    SELECT actor_role INTO v_role
    FROM security_context_session
    WHERE backend_pid = pg_backend_pid();

    IF v_role IS DISTINCT FROM 'AI_AUTOMATION'::user_role THEN
        RETURN NEW;
    END IF;

    IF OLD.state <> 'TRIAGED'::wo_state
       OR NEW.state <> 'ASSIGNED'::wo_state
       OR NEW.reporter_urgency IS NULL
       OR NEW.reporter_urgency NOT IN ('P2_MEDIUM'::priority_level, 'P3_LOW'::priority_level)
       OR NEW.calculated_priority IS NULL
       OR NEW.calculated_priority NOT IN ('P2_MEDIUM'::priority_level, 'P3_LOW'::priority_level)
       OR NEW.assigned_tech_id IS NULL
       OR NOT EXISTS (
           SELECT 1
           FROM users u
           JOIN staff_skills sk ON sk.user_id = u.id AND sk.skill = NEW.category
           WHERE u.id = NEW.assigned_tech_id
             AND u.role = 'TECHNICIAN'::user_role
             AND u.is_available = TRUE
             AND u.active_workload_count <= u.max_concurrent_workload
             AND EXISTS (
                 SELECT 1 FROM staff_shifts ss
                 WHERE ss.user_id = u.id AND ss.shift_window @> NOW()
             )
       ) THEN
        RAISE EXCEPTION 'AI_AUTOMATION may only assign eligible on-shift technicians to noncritical work orders';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_work_order_ai_automation_scope ON work_orders;
CREATE TRIGGER trg_work_order_ai_automation_scope
BEFORE UPDATE ON work_orders
FOR EACH ROW EXECUTE FUNCTION trg_fn_scope_ai_automation_assignment();

COMMIT;
