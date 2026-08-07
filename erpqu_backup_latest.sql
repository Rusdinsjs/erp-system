--
-- PostgreSQL database dump
--

\restrict cB344NqKnUScKiECYEJaj0QadqUZ9z0pAe0rhyW0FuqzW3ft2O22JFRfc9pfp75

-- Dumped from database version 17.10
-- Dumped by pg_dump version 17.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: account_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.account_type AS ENUM (
    'asset',
    'liability',
    'equity',
    'revenue',
    'expense'
);


ALTER TYPE public.account_type OWNER TO postgres;

--
-- Name: inventory_movement_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.inventory_movement_type AS ENUM (
    'IN_PURCHASE',
    'IN_ADJUSTMENT',
    'OUT_USAGE',
    'OUT_ADJUSTMENT',
    'OUT_TRANSFER'
);


ALTER TYPE public.inventory_movement_type OWNER TO postgres;

--
-- Name: journal_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.journal_status AS ENUM (
    'draft',
    'posted'
);


ALTER TYPE public.journal_status OWNER TO postgres;

--
-- Name: normal_balance; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.normal_balance AS ENUM (
    'debit',
    'credit'
);


ALTER TYPE public.normal_balance OWNER TO postgres;

--
-- Name: audit_trigger_func(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.audit_trigger_func() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    changed TEXT[];
    key TEXT;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        old_data = to_jsonb(OLD);
        INSERT INTO audit_logs (table_name, record_id, action, old_values, user_id)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', old_data, current_setting('app.current_user_id', true)::uuid);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        old_data = to_jsonb(OLD);
        new_data = to_jsonb(NEW);
        -- Find changed fields
        FOR key IN SELECT jsonb_object_keys(old_data)
        LOOP
            IF old_data->key IS DISTINCT FROM new_data->key THEN
                changed = array_append(changed, key);
            END IF;
        END LOOP;
        -- Only log if something changed
        IF array_length(changed, 1) > 0 THEN
            INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, changed_fields, user_id)
            VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', old_data, new_data, changed, current_setting('app.current_user_id', true)::uuid);
        END IF;
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        new_data = to_jsonb(NEW);
        INSERT INTO audit_logs (table_name, record_id, action, new_values, user_id)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', new_data, current_setting('app.current_user_id', true)::uuid);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION public.audit_trigger_func() OWNER TO postgres;

--
-- Name: calculate_depreciation(uuid, date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_depreciation(p_asset_id uuid, p_as_of_date date DEFAULT CURRENT_DATE) RETURNS TABLE(original_cost numeric, accumulated_depreciation numeric, book_value numeric, monthly_depreciation numeric, remaining_months integer)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_purchase_price DECIMAL;
    v_purchase_date DATE;
    v_residual_value DECIMAL;
    v_useful_life_months INTEGER;
    v_months_elapsed INTEGER;
    v_monthly_dep DECIMAL;
    v_accum_dep DECIMAL;
BEGIN
    -- Get asset data
    SELECT a.purchase_price, a.purchase_date, 
           COALESCE(a.residual_value, 0), 
           COALESCE(a.useful_life_months, c.depreciation_period_months, 60)
    INTO v_purchase_price, v_purchase_date, v_residual_value, v_useful_life_months
    FROM assets a
    LEFT JOIN categories c ON a.category_id = c.id
    WHERE a.id = p_asset_id;
    
    IF v_purchase_price IS NULL OR v_purchase_date IS NULL THEN
        RETURN QUERY SELECT 0::DECIMAL, 0::DECIMAL, 0::DECIMAL, 0::DECIMAL, 0;
        RETURN;
    END IF;
    
    -- Calculate months elapsed
    v_months_elapsed := EXTRACT(YEAR FROM age(p_as_of_date, v_purchase_date)) * 12 
                      + EXTRACT(MONTH FROM age(p_as_of_date, v_purchase_date));
    
    -- Calculate monthly depreciation (straight-line)
    v_monthly_dep := (v_purchase_price - v_residual_value) / v_useful_life_months;
    
    -- Calculate accumulated depreciation (capped at depreciable amount)
    v_accum_dep := LEAST(v_monthly_dep * v_months_elapsed, v_purchase_price - v_residual_value);
    
    RETURN QUERY SELECT 
        v_purchase_price,
        v_accum_dep,
        v_purchase_price - v_accum_dep,
        v_monthly_dep,
        GREATEST(v_useful_life_months - v_months_elapsed, 0)::INTEGER;
END;
$$;


ALTER FUNCTION public.calculate_depreciation(p_asset_id uuid, p_as_of_date date) OWNER TO postgres;

--
-- Name: prevent_approval_history_mutation(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.prevent_approval_history_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE EXCEPTION 'QWF-005 Immutability Violation: approval_histories is append-only. Overwriting prior approval decisions is forbidden.';
END;
$$;


ALTER FUNCTION public.prevent_approval_history_mutation() OWNER TO postgres;

--
-- Name: prevent_custody_history_mutation(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.prevent_custody_history_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE EXCEPTION 'QAST-005 Immutability Violation: asset_custody_history is append-only. Overwriting prior custody records is forbidden.';
END;
$$;


ALTER FUNCTION public.prevent_custody_history_mutation() OWNER TO postgres;

--
-- Name: prevent_gl_entries_mutation(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.prevent_gl_entries_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE EXCEPTION 'QACC-003 Immutability Violation: gl_entries is append-only. Updates and deletes are forbidden. Use reversing entries instead.';
END;
$$;


ALTER FUNCTION public.prevent_gl_entries_mutation() OWNER TO postgres;

--
-- Name: prevent_stock_ledger_mutation(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.prevent_stock_ledger_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE EXCEPTION 'QSTK-004 Immutability Violation: stock_ledger_entries is append-only. Updates and deletes are forbidden. Use reversing stock movements instead.';
END;
$$;


ALTER FUNCTION public.prevent_stock_ledger_mutation() OWNER TO postgres;

--
-- Name: update_asset_conversions_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_asset_conversions_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_asset_conversions_updated_at() OWNER TO postgres;

--
-- Name: update_contract_status(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_contract_status() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Set to 'expiring' if within notice period
    UPDATE rental_contracts
    SET status = 'expiring'
    WHERE status = 'active'
      AND end_date - INTERVAL '1 day' * renewal_notice_days <= CURRENT_DATE
      AND end_date > CURRENT_DATE;
    
    -- Set to 'expired' if past end date
    UPDATE rental_contracts
    SET status = 'expired'
    WHERE status IN ('active', 'expiring')
      AND end_date < CURRENT_DATE;
END;
$$;


ALTER FUNCTION public.update_contract_status() OWNER TO postgres;

--
-- Name: update_contracts_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_contracts_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_contracts_updated_at() OWNER TO postgres;

--
-- Name: update_employees_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_employees_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_employees_updated_at() OWNER TO postgres;

--
-- Name: update_preventive_schedule_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_preventive_schedule_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_preventive_schedule_updated_at() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _sqlx_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._sqlx_migrations (
    version bigint NOT NULL,
    description text NOT NULL,
    installed_on timestamp with time zone DEFAULT now() NOT NULL,
    success boolean NOT NULL,
    checksum bytea NOT NULL,
    execution_time bigint NOT NULL
);


ALTER TABLE public._sqlx_migrations OWNER TO postgres;

--
-- Name: accounting_periods; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accounting_periods (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    fiscal_year_id uuid NOT NULL,
    period_name character varying(50) NOT NULL,
    period_number integer NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_closed boolean DEFAULT false NOT NULL,
    closed_at timestamp with time zone,
    closed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.accounting_periods OWNER TO postgres;

--
-- Name: api_credentials; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.api_credentials (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id uuid NOT NULL,
    company_id uuid,
    client_name character varying(100) NOT NULL,
    api_key_hash character varying(255) NOT NULL,
    scopes text[] DEFAULT '{}'::text[] NOT NULL,
    expires_at timestamp with time zone,
    is_revoked boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.api_credentials OWNER TO postgres;

--
-- Name: app_migration_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_migration_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    app_name character varying(100) NOT NULL,
    migration_name character varying(255) NOT NULL,
    executed_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.app_migration_history OWNER TO postgres;

--
-- Name: approval_entity_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.approval_entity_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    value character varying(50) NOT NULL,
    label character varying(100) NOT NULL,
    icon character varying(50),
    color character varying(50),
    description text,
    backend_module character varying(100),
    is_active boolean DEFAULT true NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.approval_entity_types OWNER TO postgres;

--
-- Name: approval_histories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.approval_histories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    approval_request_id uuid NOT NULL,
    action character varying(50) NOT NULL,
    actor_id uuid NOT NULL,
    level integer NOT NULL,
    previous_status character varying(50),
    new_status character varying(50),
    notes text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.approval_histories OWNER TO postgres;

--
-- Name: TABLE approval_histories; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.approval_histories IS 'Complete audit trail for all approval request actions';


--
-- Name: COLUMN approval_histories.action; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.approval_histories.action IS 'Action type: created, approved, rejected, delegated, escalated, reassigned';


--
-- Name: COLUMN approval_histories.level; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.approval_histories.level IS 'Approval level (1-5) where the action occurred';


--
-- Name: COLUMN approval_histories.metadata; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.approval_histories.metadata IS 'JSON context: delegated_to, escalated_to_role, reassigned_from, etc.';


--
-- Name: approval_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.approval_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resource_type character varying(50) NOT NULL,
    resource_id uuid NOT NULL,
    action_type character varying(50) NOT NULL,
    requested_by uuid NOT NULL,
    data_snapshot jsonb,
    status character varying(50) DEFAULT 'PENDING'::character varying,
    current_approval_level integer DEFAULT 1,
    approved_by_l1 uuid,
    approved_at_l1 timestamp with time zone,
    notes_l1 text,
    approved_by_l2 uuid,
    approved_at_l2 timestamp with time zone,
    notes_l2 text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    workflow_id uuid,
    required_levels integer DEFAULT 1,
    approved_by_l3 uuid,
    approved_at_l3 timestamp with time zone,
    notes_l3 text,
    approved_by_l4 uuid,
    approved_at_l4 timestamp with time zone,
    notes_l4 text,
    approved_by_l5 uuid,
    approved_at_l5 timestamp with time zone,
    notes_l5 text,
    delegated_to uuid,
    delegated_at timestamp with time zone,
    escalated_at timestamp with time zone,
    escalated_to_role character varying(50),
    module_callback character varying(100),
    callback_data jsonb,
    final_approved_at timestamp with time zone,
    final_approved_by uuid
);


ALTER TABLE public.approval_requests OWNER TO postgres;

--
-- Name: COLUMN approval_requests.approved_by_l3; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.approval_requests.approved_by_l3 IS 'User ID who approved at level 3';


--
-- Name: COLUMN approval_requests.approved_at_l3; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.approval_requests.approved_at_l3 IS 'Timestamp of level 3 approval';


--
-- Name: COLUMN approval_requests.notes_l3; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.approval_requests.notes_l3 IS 'Notes from level 3 approver';


--
-- Name: COLUMN approval_requests.approved_by_l4; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.approval_requests.approved_by_l4 IS 'User ID who approved at level 4';


--
-- Name: COLUMN approval_requests.approved_at_l4; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.approval_requests.approved_at_l4 IS 'Timestamp of level 4 approval';


--
-- Name: COLUMN approval_requests.notes_l4; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.approval_requests.notes_l4 IS 'Notes from level 4 approver';


--
-- Name: COLUMN approval_requests.approved_by_l5; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.approval_requests.approved_by_l5 IS 'User ID who approved at level 5';


--
-- Name: COLUMN approval_requests.approved_at_l5; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.approval_requests.approved_at_l5 IS 'Timestamp of level 5 approval';


--
-- Name: COLUMN approval_requests.notes_l5; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.approval_requests.notes_l5 IS 'Notes from level 5 approver';


--
-- Name: COLUMN approval_requests.delegated_to; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.approval_requests.delegated_to IS 'User ID delegated to approve on behalf';


--
-- Name: COLUMN approval_requests.delegated_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.approval_requests.delegated_at IS 'Timestamp of delegation';


--
-- Name: COLUMN approval_requests.escalated_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.approval_requests.escalated_at IS 'Timestamp when escalated due to timeout';


--
-- Name: COLUMN approval_requests.escalated_to_role; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.approval_requests.escalated_to_role IS 'Role code escalated to';


--
-- Name: COLUMN approval_requests.module_callback; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.approval_requests.module_callback IS 'Module name for callback on final approval: work_order, loan, contract, fuel, tax_renewal, conversion';


--
-- Name: COLUMN approval_requests.callback_data; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.approval_requests.callback_data IS 'Module-specific data for callback: {wo_id, loan_id, contract_id, fuel_id, tax_renewal_id, conversion_id}';


--
-- Name: COLUMN approval_requests.final_approved_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.approval_requests.final_approved_at IS 'Timestamp when request reached final approval (all levels complete)';


--
-- Name: COLUMN approval_requests.final_approved_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.approval_requests.final_approved_by IS 'User ID who gave the final approval';


--
-- Name: approval_workflows; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.approval_workflows (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    workflow_name character varying(255) NOT NULL,
    entity_type character varying(50) NOT NULL,
    approval_levels integer DEFAULT 2 NOT NULL,
    level_1_role character varying(50),
    level_2_role character varying(50),
    level_3_role character varying(50),
    level_4_role character varying(50),
    level_5_role character varying(50),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.approval_workflows OWNER TO postgres;

--
-- Name: asset_conditions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.asset_conditions (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    color character varying(20)
);


ALTER TABLE public.asset_conditions OWNER TO postgres;

--
-- Name: asset_conditions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.asset_conditions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.asset_conditions_id_seq OWNER TO postgres;

--
-- Name: asset_conditions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.asset_conditions_id_seq OWNED BY public.asset_conditions.id;


--
-- Name: asset_conversions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.asset_conversions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_number character varying(50) NOT NULL,
    asset_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    from_category_id uuid,
    to_category_id uuid NOT NULL,
    target_specifications jsonb,
    conversion_cost numeric(18,2) DEFAULT 0,
    cost_treatment character varying(50) DEFAULT 'capitalize'::character varying NOT NULL,
    reason text,
    notes text,
    requested_by uuid NOT NULL,
    approved_by uuid,
    executed_by uuid,
    request_date timestamp with time zone DEFAULT now(),
    approval_date timestamp with time zone,
    execution_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.asset_conversions OWNER TO postgres;

--
-- Name: asset_custody_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.asset_custody_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    asset_id uuid NOT NULL,
    custodian_user_id uuid,
    department_id uuid,
    location_id uuid,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    assigned_by uuid,
    notes text
);


ALTER TABLE public.asset_custody_history OWNER TO postgres;

--
-- Name: asset_depreciation_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.asset_depreciation_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_id uuid NOT NULL,
    journal_entry_id uuid,
    amount numeric(18,2) NOT NULL,
    depreciation_date date NOT NULL,
    period_month integer NOT NULL,
    period_year integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.asset_depreciation_logs OWNER TO postgres;

--
-- Name: asset_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.asset_documents (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    asset_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(50) NOT NULL,
    file_path character varying(500) NOT NULL,
    mime_type character varying(100),
    size_bytes bigint,
    expiry_date date,
    notes text,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.asset_documents OWNER TO postgres;

--
-- Name: asset_expense_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.asset_expense_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    expense_id uuid NOT NULL,
    description character varying(255) NOT NULL,
    amount numeric(15,2) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.asset_expense_items OWNER TO postgres;

--
-- Name: asset_expenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.asset_expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_id uuid NOT NULL,
    description text NOT NULL,
    amount numeric(15,2) NOT NULL,
    date date NOT NULL,
    vendor_name text,
    invoice_number text,
    proof_url text,
    status character varying(50) DEFAULT 'PENDING'::character varying NOT NULL,
    requested_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    expense_type character varying(10) DEFAULT 'OPEX'::character varying NOT NULL,
    CONSTRAINT chk_expense_type CHECK (((expense_type)::text = ANY ((ARRAY['OPEX'::character varying, 'CAPEX'::character varying])::text[])))
);


ALTER TABLE public.asset_expenses OWNER TO postgres;

--
-- Name: asset_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.asset_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    asset_id uuid NOT NULL,
    action character varying(100) NOT NULL,
    from_location_id uuid,
    to_location_id uuid,
    from_user_id uuid,
    to_user_id uuid,
    notes text,
    performed_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.asset_history OWNER TO postgres;

--
-- Name: asset_lifecycle_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.asset_lifecycle_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_id uuid NOT NULL,
    from_state character varying(50) NOT NULL,
    to_state character varying(50) NOT NULL,
    reason text,
    performed_by uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.asset_lifecycle_history OWNER TO postgres;

--
-- Name: asset_loans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.asset_loans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    loan_number character varying(50) NOT NULL,
    asset_id uuid NOT NULL,
    borrower_id uuid,
    approver_id uuid,
    loan_date date NOT NULL,
    expected_return_date date NOT NULL,
    actual_return_date date,
    status character varying(50) DEFAULT 'requested'::character varying NOT NULL,
    condition_before text,
    condition_after text,
    damage_description text,
    damage_photos text[],
    terms_accepted boolean DEFAULT false,
    agreement_document character varying(500),
    deposit_amount numeric(18,2),
    deposit_returned boolean DEFAULT false,
    penalty_amount numeric(18,2),
    penalty_paid boolean DEFAULT false,
    checked_out_by uuid,
    checked_in_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    employee_id uuid,
    check_out_photos text[],
    return_photos text[]
);


ALTER TABLE public.asset_loans OWNER TO postgres;

--
-- Name: asset_specification_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.asset_specification_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_id uuid NOT NULL,
    conversion_id uuid,
    change_type character varying(50) NOT NULL,
    old_category_id uuid,
    new_category_id uuid,
    old_subtype character varying(100),
    new_subtype character varying(100),
    old_specifications jsonb,
    new_specifications jsonb,
    changed_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.asset_specification_history OWNER TO postgres;

--
-- Name: asset_tax_renewals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.asset_tax_renewals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_id uuid NOT NULL,
    document_type character varying(20) NOT NULL,
    current_expiry date NOT NULL,
    renewal_cost numeric(15,2),
    status character varying(20) DEFAULT 'PENDING_INPUT'::character varying NOT NULL,
    invoice_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    payment_destination character varying(255),
    invoice_attachment text,
    payment_date date
);


ALTER TABLE public.asset_tax_renewals OWNER TO postgres;

--
-- Name: asset_valuations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.asset_valuations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_id uuid NOT NULL,
    valuation_date date NOT NULL,
    original_cost numeric(18,2),
    accumulated_depreciation numeric(18,2),
    book_value numeric(18,2),
    market_value numeric(18,2),
    replacement_cost numeric(18,2),
    valuation_type character varying(50) DEFAULT 'calculated'::character varying,
    appraiser character varying(255),
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.asset_valuations OWNER TO postgres;

--
-- Name: assets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assets (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    asset_code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    category_id uuid NOT NULL,
    location_id uuid,
    department_id uuid,
    assigned_to uuid,
    vendor_id uuid,
    is_rental boolean DEFAULT false,
    asset_class character varying(50),
    status character varying(50) DEFAULT 'available'::character varying,
    condition_id integer,
    serial_number character varying(100),
    brand character varying(100),
    model character varying(100),
    year_manufacture integer,
    specifications jsonb,
    purchase_date date,
    purchase_price numeric(18,2),
    currency_id integer DEFAULT 1,
    unit_id integer DEFAULT 1,
    quantity integer DEFAULT 1,
    residual_value numeric(18,2),
    useful_life_months integer,
    qr_code_url character varying(500),
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    organization_id uuid,
    department character varying(100),
    is_fuel boolean DEFAULT false NOT NULL,
    sale_price numeric(20,4),
    sale_date date,
    sold_to character varying(255),
    photos jsonb DEFAULT '{}'::jsonb,
    is_rentable boolean DEFAULT false,
    vehicle_details jsonb,
    is_loan boolean DEFAULT false,
    version integer DEFAULT 1,
    description text,
    acquisition_method character varying(100),
    funding_source character varying(100),
    company_id uuid,
    disposal_voucher_id uuid,
    disposal_amount numeric(20,4),
    custom_data jsonb DEFAULT '{}'::jsonb NOT NULL
);


ALTER TABLE public.assets OWNER TO postgres;

--
-- Name: COLUMN assets.is_rentable; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assets.is_rentable IS 'Flag to indicate if this asset can be rented out';


--
-- Name: COLUMN assets.is_loan; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assets.is_loan IS 'Flag to indicate if this asset can be loaned internally to employees';


--
-- Name: attendance_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attendance_records (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    employee_id uuid NOT NULL,
    check_in_time timestamp with time zone,
    check_out_time timestamp with time zone,
    check_in_location_id uuid,
    check_out_location_id uuid,
    check_in_lat double precision,
    check_in_long double precision,
    check_out_lat double precision,
    check_out_long double precision,
    check_in_status character varying(20),
    check_out_status character varying(20),
    is_mock_location boolean DEFAULT false,
    device_info character varying(255),
    notes text,
    check_in_photo_url text,
    check_out_photo_url text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.attendance_records OWNER TO postgres;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    table_name character varying(100) NOT NULL,
    record_id uuid NOT NULL,
    action character varying(50) NOT NULL,
    old_values jsonb,
    new_values jsonb,
    user_id uuid,
    ip_address character varying(50),
    user_agent text,
    created_at timestamp with time zone DEFAULT now(),
    changed_fields text[]
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: audit_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_records (
    id uuid NOT NULL,
    session_id uuid NOT NULL,
    asset_id uuid NOT NULL,
    status character varying(50) NOT NULL,
    notes text,
    scanned_at timestamp with time zone NOT NULL
);


ALTER TABLE public.audit_records OWNER TO postgres;

--
-- Name: audit_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    status character varying(50) NOT NULL,
    notes text,
    created_at timestamp with time zone NOT NULL,
    closed_at timestamp with time zone
);


ALTER TABLE public.audit_sessions OWNER TO postgres;

--
-- Name: bins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bins (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    warehouse_id uuid NOT NULL,
    item_id uuid NOT NULL,
    actual_qty numeric(15,4) DEFAULT 0.0000 NOT NULL,
    reserved_qty numeric(15,4) DEFAULT 0.0000 NOT NULL,
    ordered_qty numeric(15,4) DEFAULT 0.0000 NOT NULL,
    stock_value numeric(20,4) DEFAULT 0.0000 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.bins OWNER TO postgres;

--
-- Name: bom_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bom_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    bom_id uuid NOT NULL,
    item_id uuid NOT NULL,
    qty_required numeric(15,4) NOT NULL,
    scrap_percentage numeric(5,2) DEFAULT 0.00
);


ALTER TABLE public.bom_items OWNER TO postgres;

--
-- Name: boms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.boms (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    item_id uuid NOT NULL,
    bom_number character varying(100) NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    quantity numeric(15,4) DEFAULT 1.0000 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.boms OWNER TO postgres;

--
-- Name: building_details; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.building_details (
    asset_id uuid NOT NULL,
    land_asset_id uuid,
    building_area numeric(18,2),
    floor_count integer,
    build_year integer,
    renovation_year integer,
    construction_type character varying(100),
    building_function character varying(100),
    capacity integer,
    imb_number character varying(100),
    slf_number character varying(100),
    slf_expiry date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.building_details OWNER TO postgres;

--
-- Name: cash_bank_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cash_bank_transactions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    transaction_number character varying(50) NOT NULL,
    transaction_type character varying(20) NOT NULL,
    date date NOT NULL,
    amount numeric(20,4) DEFAULT 0 NOT NULL,
    from_account_id uuid,
    to_account_id uuid,
    account_id uuid,
    contact_name character varying(255),
    description text,
    status character varying(20) DEFAULT 'posted'::character varying NOT NULL,
    journal_entry_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.cash_bank_transactions OWNER TO postgres;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    parent_id uuid,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    attributes jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    depreciation_method character varying(50) DEFAULT 'straight_line'::character varying,
    depreciation_period_months integer,
    residual_rate numeric(5,4),
    main_category character varying(100),
    sub_category_letter character varying(10),
    example_assets jsonb,
    function_description text,
    display_order integer DEFAULT 0,
    department character varying(100),
    asset_account_id uuid,
    expense_account_id uuid,
    accumulated_depreciation_account_id uuid,
    asset_group character varying(50),
    capital_wip_account_id uuid,
    gain_loss_disposal_account_id uuid
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: category_attribute_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.category_attribute_templates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    category_id uuid NOT NULL,
    attributes jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.category_attribute_templates OWNER TO postgres;

--
-- Name: chart_of_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chart_of_accounts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    account_type public.account_type NOT NULL,
    normal_balance public.normal_balance NOT NULL,
    parent_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    description text,
    currency character varying(10) DEFAULT 'IDR'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_group boolean DEFAULT false NOT NULL,
    is_frozen boolean DEFAULT false NOT NULL
);


ALTER TABLE public.chart_of_accounts OWNER TO postgres;

--
-- Name: client_contacts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.client_contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    "position" character varying(100),
    email character varying(255),
    phone character varying(50),
    can_approve_timesheet boolean DEFAULT false,
    can_approve_billing boolean DEFAULT false,
    approval_limit numeric(18,2),
    is_primary boolean DEFAULT false,
    is_active boolean DEFAULT true,
    signature_specimen text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.client_contacts OWNER TO postgres;

--
-- Name: TABLE client_contacts; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.client_contacts IS 'Contact persons (PIC) for each client';


--
-- Name: clients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    company_name character varying(255),
    email character varying(255),
    phone character varying(50),
    address text,
    city character varying(100),
    contact_person character varying(255),
    tax_id character varying(50),
    is_active boolean DEFAULT true,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    company_id uuid,
    credit_limit numeric(20,4) DEFAULT 0.0000,
    currency character varying(3) DEFAULT 'IDR'::character varying,
    npwp character varying(30),
    nik character varying(30),
    tax_name character varying(150),
    tax_address text
);


ALTER TABLE public.clients OWNER TO postgres;

--
-- Name: TABLE clients; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.clients IS 'External customers/companies for asset rental';


--
-- Name: commercial_contracts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.commercial_contracts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    contract_number character varying(100) NOT NULL,
    client_id uuid NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    status character varying(50) DEFAULT 'ACTIVE'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.commercial_contracts OWNER TO postgres;

--
-- Name: companies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    legal_name character varying(255),
    tax_id character varying(100),
    base_currency character varying(10) DEFAULT 'IDR'::character varying NOT NULL,
    country character varying(100) DEFAULT 'Indonesia'::character varying NOT NULL,
    address text,
    phone character varying(50),
    email character varying(255),
    default_bank_account_id uuid,
    fiscal_year_start_month integer DEFAULT 1,
    status character varying(50) DEFAULT 'ACTIVE'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.companies OWNER TO postgres;

--
-- Name: contract_approvals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contract_approvals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_id uuid NOT NULL,
    approver_id uuid,
    action character varying(50) NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    delegated_to uuid,
    approval_level integer DEFAULT 1 NOT NULL
);


ALTER TABLE public.contract_approvals OWNER TO postgres;

--
-- Name: TABLE contract_approvals; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.contract_approvals IS 'Tracks approval history for rental contracts';


--
-- Name: COLUMN contract_approvals.action; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.contract_approvals.action IS 'Action taken: submitted, approved, or rejected';


--
-- Name: COLUMN contract_approvals.approval_level; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.contract_approvals.approval_level IS 'The level/step being approved at this record';


--
-- Name: contract_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contract_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_id uuid NOT NULL,
    document_type character varying(50) NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path character varying(500) NOT NULL,
    file_size bigint NOT NULL,
    mime_type character varying(100) NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    notes text,
    uploaded_by uuid NOT NULL,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.contract_documents OWNER TO postgres;

--
-- Name: TABLE contract_documents; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.contract_documents IS 'Stores contract documents with versioning support';


--
-- Name: COLUMN contract_documents.document_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.contract_documents.document_type IS 'Type of document: contract, addendum, amendment, insurance, other';


--
-- Name: COLUMN contract_documents.version; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.contract_documents.version IS 'Version number for document versioning';


--
-- Name: COLUMN contract_documents.is_active; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.contract_documents.is_active IS 'Only one version per document type should be active';


--
-- Name: contract_renewals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contract_renewals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    original_contract_id uuid NOT NULL,
    new_contract_id uuid,
    renewal_type character varying(20) NOT NULL,
    previous_end_date timestamp without time zone NOT NULL,
    new_end_date timestamp without time zone NOT NULL,
    notes text,
    renewed_by uuid,
    renewed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT contract_renewals_renewal_type_check CHECK (((renewal_type)::text = ANY ((ARRAY['extend'::character varying, 'modify'::character varying, 'new'::character varying])::text[])))
);


ALTER TABLE public.contract_renewals OWNER TO postgres;

--
-- Name: contract_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contract_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    header_content text,
    body_content text NOT NULL,
    footer_content text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.contract_templates OWNER TO postgres;

--
-- Name: cost_centers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cost_centers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    company_id uuid,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    parent_id uuid,
    manager_id uuid,
    status character varying(50) DEFAULT 'ACTIVE'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.cost_centers OWNER TO postgres;

--
-- Name: currencies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.currencies (
    id integer NOT NULL,
    code character varying(3) NOT NULL,
    name character varying(100) NOT NULL,
    symbol character varying(10)
);


ALTER TABLE public.currencies OWNER TO postgres;

--
-- Name: currencies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.currencies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.currencies_id_seq OWNER TO postgres;

--
-- Name: currencies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.currencies_id_seq OWNED BY public.currencies.id;


--
-- Name: custom_docperms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.custom_docperms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    doctype_id uuid NOT NULL,
    role_id uuid NOT NULL,
    permlevel integer DEFAULT 0 NOT NULL,
    read_perm boolean DEFAULT true NOT NULL,
    write_perm boolean DEFAULT false NOT NULL,
    create_perm boolean DEFAULT false NOT NULL,
    delete_perm boolean DEFAULT false NOT NULL,
    submit_perm boolean DEFAULT false NOT NULL,
    cancel_perm boolean DEFAULT false NOT NULL,
    amend_perm boolean DEFAULT false NOT NULL,
    print_perm boolean DEFAULT true NOT NULL,
    email_perm boolean DEFAULT false NOT NULL,
    export_perm boolean DEFAULT false NOT NULL,
    import_perm boolean DEFAULT false NOT NULL,
    share_perm boolean DEFAULT false NOT NULL,
    report_perm boolean DEFAULT true NOT NULL,
    if_owner boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.custom_docperms OWNER TO postgres;

--
-- Name: data_import_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.data_import_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    data_import_id uuid NOT NULL,
    row_number integer NOT NULL,
    status character varying(20) NOT NULL,
    record_identifier character varying(100),
    messages jsonb DEFAULT '[]'::jsonb NOT NULL,
    row_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.data_import_logs OWNER TO postgres;

--
-- Name: data_imports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.data_imports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    doctype_name character varying(100) NOT NULL,
    import_type character varying(20) DEFAULT 'Insert'::character varying NOT NULL,
    file_name character varying(255) NOT NULL,
    status character varying(30) DEFAULT 'Pending'::character varying NOT NULL,
    total_rows integer DEFAULT 0 NOT NULL,
    successful_rows integer DEFAULT 0 NOT NULL,
    failed_rows integer DEFAULT 0 NOT NULL,
    created_by_user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.data_imports OWNER TO postgres;

--
-- Name: data_migration_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.data_migration_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    migration_name character varying(150) NOT NULL,
    step_number integer NOT NULL,
    step_name character varying(50) NOT NULL,
    records_inventoried integer DEFAULT 0,
    records_backfilled integer DEFAULT 0,
    reconciled_sum_delta numeric(20,4) DEFAULT 0.0000,
    status character varying(50) DEFAULT 'COMPLETED'::character varying NOT NULL,
    executed_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.data_migration_logs OWNER TO postgres;

--
-- Name: departments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.departments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    parent_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    organization_id uuid,
    description text
);


ALTER TABLE public.departments OWNER TO postgres;

--
-- Name: depreciation_schedules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.depreciation_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_id uuid NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    opening_value numeric(18,2) NOT NULL,
    depreciation_amount numeric(18,2) NOT NULL,
    accumulated_depreciation numeric(18,2) NOT NULL,
    closing_value numeric(18,2) NOT NULL,
    depreciation_method character varying(50) NOT NULL,
    is_calculated boolean DEFAULT false,
    calculated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.depreciation_schedules OWNER TO postgres;

--
-- Name: doctypes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.doctypes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    module character varying(100) NOT NULL,
    description text,
    is_submittable boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.doctypes OWNER TO postgres;

--
-- Name: document_audit_trail; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.document_audit_trail (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    document_type text NOT NULL,
    action text NOT NULL,
    actor_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    company_id uuid,
    from_status text,
    to_status text,
    document_version integer DEFAULT 1 NOT NULL,
    reason text,
    correlation_id text DEFAULT ''::text NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.document_audit_trail OWNER TO postgres;

--
-- Name: employee_evaluations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employee_evaluations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    employee_id uuid NOT NULL,
    evaluator_id uuid,
    year integer NOT NULL,
    period character varying(20),
    score character varying(50),
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.employee_evaluations OWNER TO postgres;

--
-- Name: employees; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nik character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(50),
    department_id uuid,
    "position" character varying(100),
    employment_status character varying(50) DEFAULT 'pkwt'::character varying NOT NULL,
    user_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    ktp_number character varying(20),
    photo_url text,
    gender character varying(1),
    place_of_birth character varying(100),
    date_of_birth date,
    marital_status character varying(20),
    children_count integer DEFAULT 0,
    address text,
    residence_status character varying(50),
    religion character varying(50),
    blood_type character varying(5),
    emergency_contact_name character varying(100),
    emergency_contact_phone character varying(20),
    emergency_contact_relation character varying(50),
    start_date date,
    end_contract_date date,
    resignation_date date,
    resignation_reason text,
    is_manager boolean DEFAULT false,
    manager_id uuid,
    is_evaluator boolean DEFAULT false,
    education character varying(50),
    grade character varying(20),
    competencies text,
    competency_attachments jsonb,
    bank_account character varying(50),
    bank_name character varying(50),
    npwp character varying(30),
    bpjs_kesehatan character varying(30),
    bpjs_tenaga_kerja character varying(30),
    basic_salary numeric(15,2),
    is_allowance boolean DEFAULT false,
    allowances jsonb,
    leave_balance integer DEFAULT 12,
    leave_used integer DEFAULT 0,
    face_embeddings jsonb,
    face_verification_status character varying(20) DEFAULT 'none'::character varying,
    office_location_id uuid,
    allowed_radius integer DEFAULT 50,
    assigned_asset_id uuid,
    work_area_id uuid,
    is_account_requested boolean DEFAULT false,
    CONSTRAINT employees_gender_check CHECK (((gender)::text = ANY ((ARRAY['L'::character varying, 'P'::character varying])::text[])))
);


ALTER TABLE public.employees OWNER TO postgres;

--
-- Name: entity_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.entity_types (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    module character varying(50) DEFAULT 'CUSTOM'::character varying NOT NULL,
    storage_strategy character varying(50) DEFAULT 'HYBRID_JSONB'::character varying NOT NULL,
    is_custom boolean DEFAULT true NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.entity_types OWNER TO postgres;

--
-- Name: expense_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expense_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    expense_id uuid NOT NULL,
    account_id uuid NOT NULL,
    description text,
    amount numeric(20,4) DEFAULT 0 NOT NULL
);


ALTER TABLE public.expense_items OWNER TO postgres;

--
-- Name: expenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expenses (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    expense_number character varying(50) NOT NULL,
    date date NOT NULL,
    pay_from_account_id uuid NOT NULL,
    recipient character varying(255),
    total_amount numeric(20,4) DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'paid'::character varying NOT NULL,
    journal_entry_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    attachment_url text,
    expense_type character varying(10) DEFAULT 'OPEX'::character varying NOT NULL,
    CONSTRAINT chk_finance_expense_type CHECK (((expense_type)::text = ANY ((ARRAY['OPEX'::character varying, 'CAPEX'::character varying])::text[])))
);


ALTER TABLE public.expenses OWNER TO postgres;

--
-- Name: face_photos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.face_photos (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    employee_id uuid NOT NULL,
    photo_path text NOT NULL,
    photo_order integer NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.face_photos OWNER TO postgres;

--
-- Name: field_definitions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.field_definitions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    entity_type_id uuid NOT NULL,
    field_name character varying(100) NOT NULL,
    label character varying(100) NOT NULL,
    data_type character varying(50) NOT NULL,
    is_required boolean DEFAULT false NOT NULL,
    is_readonly boolean DEFAULT false NOT NULL,
    default_value text,
    options_json jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.field_definitions OWNER TO postgres;

--
-- Name: fiscal_years; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fiscal_years (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    year_name character varying(50) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_closed boolean DEFAULT false NOT NULL,
    closed_at timestamp with time zone,
    closed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.fiscal_years OWNER TO postgres;

--
-- Name: fuel_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fuel_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tracking_number character varying(50) NOT NULL,
    asset_id uuid NOT NULL,
    requested_by uuid NOT NULL,
    driver_id uuid,
    odometer_reading numeric(12,2) NOT NULL,
    odometer_image_url text NOT NULL,
    request_type character varying(20) NOT NULL,
    requested_value numeric(15,2) NOT NULL,
    status character varying(20) DEFAULT 'requested'::character varying NOT NULL,
    coupon_code character varying(50),
    approved_by uuid,
    approved_at timestamp with time zone,
    rejection_reason text,
    actual_filled_amount numeric(15,2),
    actual_volume numeric(10,2),
    receipt_image_url text,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fuel_logs_request_type_check CHECK (((request_type)::text = ANY ((ARRAY['volume'::character varying, 'amount'::character varying])::text[]))),
    CONSTRAINT fuel_logs_status_check CHECK (((status)::text = ANY ((ARRAY['requested'::character varying, 'approved'::character varying, 'rejected'::character varying, 'completed'::character varying])::text[])))
);


ALTER TABLE public.fuel_logs OWNER TO postgres;

--
-- Name: furniture_details; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.furniture_details (
    asset_id uuid NOT NULL,
    furniture_type character varying(100),
    material character varying(100),
    dimensions character varying(100),
    color character varying(50),
    capacity character varying(100),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.furniture_details OWNER TO postgres;

--
-- Name: gl_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.gl_entries (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    posting_date date NOT NULL,
    posting_datetime timestamp with time zone DEFAULT now() NOT NULL,
    account_id uuid NOT NULL,
    party_type character varying(50),
    party_id uuid,
    cost_center_id uuid,
    project_id uuid,
    currency character varying(3) DEFAULT 'IDR'::character varying NOT NULL,
    exchange_rate numeric(18,6) DEFAULT 1.000000 NOT NULL,
    debit numeric(20,4) DEFAULT 0.0000 NOT NULL,
    credit numeric(20,4) DEFAULT 0.0000 NOT NULL,
    debit_in_account_currency numeric(20,4) DEFAULT 0.0000 NOT NULL,
    credit_in_account_currency numeric(20,4) DEFAULT 0.0000 NOT NULL,
    voucher_type character varying(50) NOT NULL,
    voucher_no character varying(100) NOT NULL,
    voucher_id uuid NOT NULL,
    is_reversal boolean DEFAULT false NOT NULL,
    reversal_source_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid
);


ALTER TABLE public.gl_entries OWNER TO postgres;

--
-- Name: heavy_equipment_details; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.heavy_equipment_details (
    asset_id uuid NOT NULL,
    equipment_type character varying(100),
    operating_weight numeric(18,2),
    capacity character varying(100),
    engine_model character varying(100),
    hour_meter numeric(18,2),
    certification_number character varying(100),
    certification_expiry date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.heavy_equipment_details OWNER TO postgres;

--
-- Name: id_tax_invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.id_tax_invoices (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    sales_invoice_id uuid,
    tax_invoice_number character varying(50) NOT NULL,
    npwp_buyer character varying(30) NOT NULL,
    name_buyer character varying(150) NOT NULL,
    tax_base numeric(20,4) NOT NULL,
    vat_amount numeric(20,4) NOT NULL,
    vat_rate numeric(5,2) DEFAULT 11.00 NOT NULL,
    effective_date date NOT NULL,
    status character varying(50) DEFAULT 'POSTED'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.id_tax_invoices OWNER TO postgres;

--
-- Name: id_withholding_certificates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.id_withholding_certificates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    certificate_number character varying(100) NOT NULL,
    pph_type character varying(50) NOT NULL,
    vendor_id uuid,
    client_id uuid,
    gross_amount numeric(20,4) NOT NULL,
    pph_amount numeric(20,4) NOT NULL,
    pph_rate numeric(5,2) NOT NULL,
    posting_date date NOT NULL,
    status character varying(50) DEFAULT 'POSTED'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.id_withholding_certificates OWNER TO postgres;

--
-- Name: idempotency_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.idempotency_log (
    idempotency_key text NOT NULL,
    actor_id uuid NOT NULL,
    company_id uuid NOT NULL,
    source_type text NOT NULL,
    source_id uuid NOT NULL,
    correlation_id text NOT NULL,
    status text DEFAULT 'PROCESSING'::text NOT NULL,
    outcome text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    request_fingerprint text NOT NULL,
    CONSTRAINT chk_idempotency_request_fingerprint_nonempty CHECK ((length(btrim(request_fingerprint)) > 0)),
    CONSTRAINT idempotency_log_status_check CHECK ((status = ANY (ARRAY['PROCESSING'::text, 'COMPLETED'::text, 'FAILED'::text])))
);


ALTER TABLE public.idempotency_log OWNER TO postgres;

--
-- Name: installed_apps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.installed_apps (
    app_name character varying(100) NOT NULL,
    version character varying(50) NOT NULL,
    required_kernel_version character varying(50) DEFAULT '1.0.0'::character varying NOT NULL,
    status character varying(50) DEFAULT 'INSTALLED'::character varying NOT NULL,
    installed_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.installed_apps OWNER TO postgres;

--
-- Name: insurances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.insurances (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    asset_id uuid NOT NULL,
    policy_number character varying(100) NOT NULL,
    insurance_provider character varying(255) NOT NULL,
    coverage_type character varying(100),
    coverage_amount numeric(18,2),
    start_date date NOT NULL,
    end_date date NOT NULL,
    premium_amount numeric(18,2),
    status character varying(50) DEFAULT 'active'::character varying,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.insurances OWNER TO postgres;

--
-- Name: inventory_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    inventory_account_id uuid,
    expense_account_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.inventory_categories OWNER TO postgres;

--
-- Name: inventory_details; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_details (
    asset_id uuid NOT NULL,
    inventory_type character varying(100),
    warranty_expiry date,
    os_license character varying(100),
    mac_address character varying(100),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.inventory_details OWNER TO postgres;

--
-- Name: inventory_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(50) NOT NULL,
    file_path text NOT NULL,
    mime_type character varying(100),
    size_bytes bigint,
    expiry_date date,
    notes text,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.inventory_documents OWNER TO postgres;

--
-- Name: inventory_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_id uuid NOT NULL,
    unit_id integer NOT NULL,
    sku character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    min_stock numeric(15,2) DEFAULT 0,
    max_stock numeric(15,2) DEFAULT 0,
    current_quantity numeric(15,2) DEFAULT 0 NOT NULL,
    average_cost numeric(18,2) DEFAULT 0 NOT NULL,
    last_purchase_price numeric(18,2) DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    company_id uuid,
    custom_data jsonb DEFAULT '{}'::jsonb NOT NULL
);


ALTER TABLE public.inventory_items OWNER TO postgres;

--
-- Name: inventory_movements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_id uuid NOT NULL,
    movement_type public.inventory_movement_type NOT NULL,
    quantity numeric(15,2) NOT NULL,
    unit_price numeric(18,2) NOT NULL,
    total_value numeric(18,2) NOT NULL,
    reference_id uuid,
    reference_number character varying(100),
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.inventory_movements OWNER TO postgres;

--
-- Name: journal_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.journal_entries (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    transaction_number character varying(50) NOT NULL,
    date date NOT NULL,
    description text NOT NULL,
    reference character varying(100),
    status public.journal_status DEFAULT 'draft'::public.journal_status NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.journal_entries OWNER TO postgres;

--
-- Name: journal_lines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.journal_lines (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    journal_entry_id uuid NOT NULL,
    account_id uuid NOT NULL,
    description text,
    debit numeric(20,4) DEFAULT 0 NOT NULL,
    credit numeric(20,4) DEFAULT 0 NOT NULL,
    CONSTRAINT check_at_least_one CHECK (((debit > (0)::numeric) OR (credit > (0)::numeric))),
    CONSTRAINT check_one_side_only CHECK ((NOT ((debit > (0)::numeric) AND (credit > (0)::numeric)))),
    CONSTRAINT check_positive_amounts CHECK (((debit >= (0)::numeric) AND (credit >= (0)::numeric)))
);


ALTER TABLE public.journal_lines OWNER TO postgres;

--
-- Name: land_details; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.land_details (
    asset_id uuid NOT NULL,
    certificate_number character varying(100),
    land_area numeric(18,2),
    address text,
    zoning character varying(100),
    rights_status character varying(100),
    rights_expiry date,
    pbb_number character varying(100),
    njop_value numeric(18,2),
    gps_coordinates character varying(255),
    boundaries text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.land_details OWNER TO postgres;

--
-- Name: landed_cost_vouchers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.landed_cost_vouchers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    voucher_number character varying(100) NOT NULL,
    posting_date date NOT NULL,
    total_landed_cost numeric(20,4) NOT NULL,
    distribute_by character varying(50) DEFAULT 'QTY'::character varying NOT NULL,
    status character varying(50) DEFAULT 'draft'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid
);


ALTER TABLE public.landed_cost_vouchers OWNER TO postgres;

--
-- Name: layout_definitions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.layout_definitions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    entity_type_id uuid NOT NULL,
    layout_name character varying(100) DEFAULT 'DEFAULT'::character varying NOT NULL,
    layout_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.layout_definitions OWNER TO postgres;

--
-- Name: leads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.leads (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    lead_name character varying(150) NOT NULL,
    organization_name character varying(150),
    email character varying(100),
    phone character varying(50),
    status character varying(50) DEFAULT 'LEAD'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.leads OWNER TO postgres;

--
-- Name: leave_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.leave_requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    employee_id uuid NOT NULL,
    leave_type character varying(50) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    days_count integer NOT NULL,
    reason text,
    status character varying(20) DEFAULT 'pending'::character varying,
    approved_by uuid,
    approved_at timestamp with time zone,
    rejection_reason text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.leave_requests OWNER TO postgres;

--
-- Name: locations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.locations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    parent_id uuid,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    type character varying(50),
    address text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    latitude character varying(50),
    longitude character varying(50),
    capacity integer,
    current_count integer DEFAULT 0,
    qr_code character varying(255),
    check_in_time time without time zone DEFAULT '08:00:00'::time without time zone,
    check_out_time time without time zone DEFAULT '17:00:00'::time without time zone,
    check_in_tolerance integer DEFAULT 30,
    check_out_tolerance integer DEFAULT 15,
    radius integer DEFAULT 50
);


ALTER TABLE public.locations OWNER TO postgres;

--
-- Name: COLUMN locations.latitude; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.locations.latitude IS 'Latitude coordinate';


--
-- Name: COLUMN locations.longitude; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.locations.longitude IS 'Longitude coordinate';


--
-- Name: COLUMN locations.capacity; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.locations.capacity IS 'Maximum capacity for capacity planning';


--
-- Name: COLUMN locations.current_count; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.locations.current_count IS 'Current utilization/occupancy';


--
-- Name: machine_details; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.machine_details (
    asset_id uuid NOT NULL,
    machine_type character varying(100),
    technical_specs text,
    installation_year integer,
    operating_hours numeric(18,2),
    energy_source character varying(100),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.machine_details OWNER TO postgres;

--
-- Name: maintenance_checklists; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.maintenance_checklists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    work_order_id uuid NOT NULL,
    task_number integer NOT NULL,
    description text NOT NULL,
    instructions text,
    expected_result text,
    status character varying(50) DEFAULT 'pending'::character varying,
    completed_by uuid,
    completed_at timestamp with time zone,
    actual_result text,
    verified_by uuid,
    verified_at timestamp with time zone,
    verification_notes text,
    photos text[],
    readings jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.maintenance_checklists OWNER TO postgres;

--
-- Name: maintenance_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.maintenance_records (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    asset_id uuid NOT NULL,
    maintenance_type_id integer,
    scheduled_date date,
    actual_date date,
    description text,
    findings text,
    actions_taken text,
    cost numeric(15,2),
    currency_id integer DEFAULT 1,
    performed_by character varying(255),
    vendor_id uuid,
    status character varying(50) DEFAULT 'planned'::character varying,
    next_service_date date,
    odometer_reading integer,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    assigned_to uuid,
    approval_status character varying(50) DEFAULT 'not_required'::character varying,
    cost_threshold_exceeded boolean DEFAULT false
);


ALTER TABLE public.maintenance_records OWNER TO postgres;

--
-- Name: COLUMN maintenance_records.approval_status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.maintenance_records.approval_status IS 'Values: not_required, pending_approval, approved, rejected';


--
-- Name: maintenance_schedules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.maintenance_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    interval_type character varying(50) NOT NULL,
    interval_value integer NOT NULL,
    interval_unit character varying(50) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_run_date date,
    last_run_reading integer,
    next_run_date date,
    next_run_reading integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.maintenance_schedules OWNER TO postgres;

--
-- Name: maintenance_template_tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.maintenance_template_tasks (
    id uuid NOT NULL,
    template_id uuid NOT NULL,
    task_number integer NOT NULL,
    description text NOT NULL,
    instructions text,
    expected_result text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.maintenance_template_tasks OWNER TO postgres;

--
-- Name: maintenance_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.maintenance_templates (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    asset_category_id uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    version integer DEFAULT 1,
    is_active boolean DEFAULT true,
    parent_id uuid,
    usage_count integer DEFAULT 0,
    last_used_at timestamp with time zone
);


ALTER TABLE public.maintenance_templates OWNER TO postgres;

--
-- Name: maintenance_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.maintenance_types (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    is_preventive boolean DEFAULT false
);


ALTER TABLE public.maintenance_types OWNER TO postgres;

--
-- Name: maintenance_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.maintenance_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.maintenance_types_id_seq OWNER TO postgres;

--
-- Name: maintenance_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.maintenance_types_id_seq OWNED BY public.maintenance_types.id;


--
-- Name: maintenance_work_order_parts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.maintenance_work_order_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    work_order_id uuid NOT NULL,
    part_name character varying(255) NOT NULL,
    quantity numeric(10,2) DEFAULT 1 NOT NULL,
    unit_cost numeric(18,2) DEFAULT 0 NOT NULL,
    total_cost numeric(18,2) DEFAULT 0 NOT NULL,
    added_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    expense_type character varying(10) DEFAULT 'OPEX'::character varying,
    inventory_item_id uuid,
    CONSTRAINT chk_part_expense_type CHECK (((expense_type)::text = ANY ((ARRAY['OPEX'::character varying, 'CAPEX'::character varying])::text[])))
);


ALTER TABLE public.maintenance_work_order_parts OWNER TO postgres;

--
-- Name: maintenance_work_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.maintenance_work_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wo_number character varying(50) NOT NULL,
    asset_id uuid NOT NULL,
    wo_type character varying(50) DEFAULT 'corrective'::character varying NOT NULL,
    priority character varying(20) DEFAULT 'medium'::character varying,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    scheduled_date date,
    due_date date,
    actual_start_date timestamp with time zone,
    actual_end_date timestamp with time zone,
    assigned_technician uuid,
    vendor_id uuid,
    estimated_hours numeric(8,2),
    actual_hours numeric(8,2),
    estimated_cost numeric(18,2),
    actual_cost numeric(18,2),
    parts_cost numeric(18,2),
    labor_cost numeric(18,2),
    problem_description text,
    work_performed text,
    recommendations text,
    safety_requirements text[],
    lockout_tagout_required boolean DEFAULT false,
    completion_notes text,
    customer_signoff character varying(255),
    technician_signoff character varying(255),
    created_by uuid,
    approved_by uuid,
    completed_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    location_id uuid,
    target_category_id uuid,
    target_specifications jsonb,
    conversion_notes text,
    conversion_type character varying(50),
    labor_expense_type character varying(10),
    expense_id uuid,
    opex_expense_id uuid,
    capex_expense_id uuid,
    supervisor_signoff text,
    company_id uuid,
    custom_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT chk_wo_expense_type CHECK (((labor_expense_type)::text = ANY ((ARRAY['OPEX'::character varying, 'CAPEX'::character varying])::text[])))
);


ALTER TABLE public.maintenance_work_orders OWNER TO postgres;

--
-- Name: COLUMN maintenance_work_orders.wo_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.maintenance_work_orders.wo_type IS 'Type of work order: predictive, corrective, preventive, calibration, conversion, upgrade';


--
-- Name: naming_series; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.naming_series (
    entity_type text NOT NULL,
    company_id uuid NOT NULL,
    prefix text NOT NULL,
    year integer NOT NULL,
    last_counter bigint DEFAULT 0 NOT NULL,
    CONSTRAINT chk_naming_series_counter_positive CHECK ((last_counter >= 0))
);


ALTER TABLE public.naming_series OWNER TO postgres;

--
-- Name: notification_preferences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notification_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    template_id uuid,
    event_type character varying(100),
    email_enabled boolean DEFAULT true,
    push_enabled boolean DEFAULT true,
    sms_enabled boolean DEFAULT false,
    in_app_enabled boolean DEFAULT true,
    digest_frequency character varying(20),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.notification_preferences OWNER TO postgres;

--
-- Name: notification_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notification_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    subject_template text,
    body_template text,
    channels text[] DEFAULT ARRAY['in_app'::text],
    event_type character varying(100) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.notification_templates OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    template_id uuid,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    data jsonb,
    channel character varying(20) DEFAULT 'in_app'::character varying NOT NULL,
    entity_type character varying(50),
    entity_id uuid,
    is_read boolean DEFAULT false,
    read_at timestamp with time zone,
    is_sent boolean DEFAULT false,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: opening_balance_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.opening_balance_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    voucher_id uuid NOT NULL,
    account_id uuid,
    warehouse_id uuid,
    item_id uuid,
    qty numeric(15,4) DEFAULT 0.0000,
    unit_cost numeric(18,6) DEFAULT 0.0000,
    amount numeric(20,4) DEFAULT 0.0000 NOT NULL
);


ALTER TABLE public.opening_balance_items OWNER TO postgres;

--
-- Name: opening_balance_vouchers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.opening_balance_vouchers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    voucher_type character varying(50) NOT NULL,
    cutover_date date NOT NULL,
    total_amount numeric(20,4) DEFAULT 0.0000 NOT NULL,
    source_system character varying(100) NOT NULL,
    status character varying(50) DEFAULT 'POSTED'::character varying NOT NULL,
    created_by uuid,
    posted_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.opening_balance_vouchers OWNER TO postgres;

--
-- Name: opportunities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.opportunities (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    lead_id uuid,
    title character varying(200) NOT NULL,
    estimated_value numeric(20,4) DEFAULT 0.0000 NOT NULL,
    stage character varying(50) DEFAULT 'PROSPECTING'::character varying NOT NULL,
    expected_closing_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.opportunities OWNER TO postgres;

--
-- Name: organizations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    parent_id uuid,
    org_type character varying(50) DEFAULT 'company'::character varying,
    cost_center character varying(100),
    budget numeric(18,2),
    manager_id uuid,
    is_active boolean DEFAULT true,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.organizations OWNER TO postgres;

--
-- Name: outbox; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.outbox (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text NOT NULL,
    payload text NOT NULL,
    source_type text NOT NULL,
    source_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    company_id uuid,
    correlation_id text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    max_attempts integer DEFAULT 5 NOT NULL,
    next_attempt_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_error text,
    completed_at timestamp with time zone,
    CONSTRAINT chk_outbox_attempt_bounds CHECK (((attempt_count >= 0) AND (attempt_count <= (max_attempts + 1)))),
    CONSTRAINT chk_outbox_completed_at_consistency CHECK (((completed_at IS NULL) OR (status = ANY (ARRAY['COMPLETED'::text, 'DEAD_LETTER'::text])))),
    CONSTRAINT chk_outbox_max_attempts_positive CHECK ((max_attempts > 0)),
    CONSTRAINT chk_outbox_nonempty_event_type CHECK (((event_type <> ''::text) AND (source_type <> ''::text))),
    CONSTRAINT outbox_status_check CHECK ((status = ANY (ARRAY['PENDING'::text, 'PROCESSING'::text, 'COMPLETED'::text, 'FAILED'::text, 'DEAD_LETTER'::text])))
);


ALTER TABLE public.outbox OWNER TO postgres;

--
-- Name: payroll_slips; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payroll_slips (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    gross_salary numeric(20,4) NOT NULL,
    total_deductions numeric(20,4) NOT NULL,
    net_salary numeric(20,4) NOT NULL,
    status character varying(50) DEFAULT 'POSTED'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.payroll_slips OWNER TO postgres;

--
-- Name: permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(100) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    resource character varying(50) NOT NULL,
    action character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.permissions OWNER TO postgres;

--
-- Name: pos_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pos_profiles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    profile_name character varying(100) NOT NULL,
    warehouse_id uuid NOT NULL,
    cash_account_id uuid NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.pos_profiles OWNER TO postgres;

--
-- Name: pos_shifts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pos_shifts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    pos_profile_id uuid NOT NULL,
    cashier_user_id uuid NOT NULL,
    opening_balance numeric(20,4) DEFAULT 0.0000 NOT NULL,
    closing_balance numeric(20,4),
    status character varying(50) DEFAULT 'OPEN'::character varying NOT NULL,
    opened_at timestamp with time zone DEFAULT now() NOT NULL,
    closed_at timestamp with time zone
);


ALTER TABLE public.pos_shifts OWNER TO postgres;

--
-- Name: preventive_schedules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.preventive_schedules (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    asset_id uuid NOT NULL,
    maintenance_type_id integer,
    name character varying(255) NOT NULL,
    interval_type character varying(20) NOT NULL,
    interval_value integer NOT NULL,
    last_execution_date date,
    last_execution_odometer integer,
    next_due_date date,
    next_due_odometer integer,
    is_active boolean DEFAULT true,
    notification_days_before integer DEFAULT 7,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT preventive_schedules_interval_type_check CHECK (((interval_type)::text = ANY ((ARRAY['days'::character varying, 'km'::character varying, 'hours'::character varying])::text[])))
);


ALTER TABLE public.preventive_schedules OWNER TO postgres;

--
-- Name: COLUMN preventive_schedules.interval_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.preventive_schedules.interval_type IS 'Schedule interval type: days, km, hours';


--
-- Name: print_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.print_templates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    entity_type_id uuid,
    document_type character varying(100) NOT NULL,
    template_name character varying(100) NOT NULL,
    html_template text NOT NULL,
    css_styles text,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.print_templates OWNER TO postgres;

--
-- Name: production_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.production_orders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    production_order_number character varying(100) NOT NULL,
    bom_id uuid NOT NULL,
    item_id uuid NOT NULL,
    target_qty numeric(15,4) NOT NULL,
    produced_qty numeric(15,4) DEFAULT 0.0000 NOT NULL,
    warehouse_id uuid NOT NULL,
    status character varying(50) DEFAULT 'DRAFT'::character varying NOT NULL,
    wip_account_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.production_orders OWNER TO postgres;

--
-- Name: project_tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_tasks (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    project_id uuid NOT NULL,
    task_name character varying(200) NOT NULL,
    status character varying(50) DEFAULT 'OPEN'::character varying NOT NULL,
    estimated_hours numeric(10,2) DEFAULT 0.00,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.project_tasks OWNER TO postgres;

--
-- Name: projects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.projects (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    project_code character varying(50) NOT NULL,
    project_name character varying(200) NOT NULL,
    cost_center_id uuid,
    status character varying(50) DEFAULT 'PLANNING'::character varying NOT NULL,
    budget_amount numeric(20,4) DEFAULT 0.0000 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.projects OWNER TO postgres;

--
-- Name: purchase_bill_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchase_bill_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    bill_id uuid NOT NULL,
    description text NOT NULL,
    quantity numeric(15,4) DEFAULT 1 NOT NULL,
    unit_price numeric(20,4) DEFAULT 0 NOT NULL,
    total_price numeric(20,4) DEFAULT 0 NOT NULL,
    account_id uuid,
    source_type character varying(50),
    source_id uuid,
    source_line_id uuid
);


ALTER TABLE public.purchase_bill_items OWNER TO postgres;

--
-- Name: purchase_bills; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchase_bills (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    bill_number character varying(50) NOT NULL,
    vendor_id uuid NOT NULL,
    date date NOT NULL,
    due_date date,
    subject text,
    subtotal numeric(20,4) DEFAULT 0 NOT NULL,
    tax numeric(20,4) DEFAULT 0 NOT NULL,
    total_amount numeric(20,4) DEFAULT 0 NOT NULL,
    amount_paid numeric(20,4) DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    created_by uuid,
    journal_entry_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    attachment_url text,
    budget_type character varying(10) DEFAULT 'OPEX'::character varying NOT NULL,
    company_id uuid,
    custom_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT chk_purchase_bill_budget_type CHECK (((budget_type)::text = ANY ((ARRAY['OPEX'::character varying, 'CAPEX'::character varying])::text[])))
);


ALTER TABLE public.purchase_bills OWNER TO postgres;

--
-- Name: purchase_order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchase_order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    purchase_order_id uuid NOT NULL,
    description character varying(255) NOT NULL,
    quantity numeric(10,2) DEFAULT 1 NOT NULL,
    unit_price numeric(15,2) DEFAULT 0 NOT NULL,
    amount numeric(15,2) DEFAULT 0 NOT NULL
);


ALTER TABLE public.purchase_order_items OWNER TO postgres;

--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchase_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_number character varying(50) NOT NULL,
    purchase_quote_id uuid,
    vendor_id uuid NOT NULL,
    date date NOT NULL,
    delivery_date date,
    subject character varying(255),
    subtotal numeric(15,2) DEFAULT 0 NOT NULL,
    tax numeric(15,2) DEFAULT 0 NOT NULL,
    total_amount numeric(15,2) DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    budget_type character varying(10) DEFAULT 'OPEX'::character varying NOT NULL,
    CONSTRAINT check_purchase_order_budget_type CHECK (((budget_type)::text = ANY ((ARRAY['OPEX'::character varying, 'CAPEX'::character varying])::text[])))
);


ALTER TABLE public.purchase_orders OWNER TO postgres;

--
-- Name: purchase_quote_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchase_quote_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    purchase_quote_id uuid NOT NULL,
    description character varying(255) NOT NULL,
    quantity numeric(10,2) DEFAULT 1 NOT NULL,
    unit_price numeric(15,2) DEFAULT 0 NOT NULL,
    amount numeric(15,2) DEFAULT 0 NOT NULL
);


ALTER TABLE public.purchase_quote_items OWNER TO postgres;

--
-- Name: purchase_quotes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchase_quotes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_number character varying(50) NOT NULL,
    vendor_id uuid NOT NULL,
    date date NOT NULL,
    expiry_date date,
    subject character varying(255),
    subtotal numeric(15,2) DEFAULT 0 NOT NULL,
    tax numeric(15,2) DEFAULT 0 NOT NULL,
    total_amount numeric(15,2) DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.purchase_quotes OWNER TO postgres;

--
-- Name: purchase_receipt_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchase_receipt_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    receipt_id uuid NOT NULL,
    item_id uuid NOT NULL,
    qty_received numeric(15,4) NOT NULL,
    unit_cost numeric(18,6) NOT NULL,
    total_amount numeric(20,4) NOT NULL,
    po_line_id uuid,
    batch_no character varying(100),
    serial_no character varying(100)
);


ALTER TABLE public.purchase_receipt_items OWNER TO postgres;

--
-- Name: purchase_receipts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchase_receipts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    receipt_number character varying(100) NOT NULL,
    purchase_order_id uuid,
    vendor_id uuid NOT NULL,
    warehouse_id uuid NOT NULL,
    posting_date date NOT NULL,
    status character varying(50) DEFAULT 'draft'::character varying NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid
);


ALTER TABLE public.purchase_receipts OWNER TO postgres;

--
-- Name: purchase_shipment_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchase_shipment_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    purchase_shipment_id uuid NOT NULL,
    description character varying(255) NOT NULL,
    quantity_received numeric(10,2) DEFAULT 0 NOT NULL,
    source_type character varying(50),
    source_id uuid,
    source_line_id uuid
);


ALTER TABLE public.purchase_shipment_items OWNER TO postgres;

--
-- Name: purchase_shipments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchase_shipments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shipment_number character varying(50) NOT NULL,
    purchase_order_id uuid,
    vendor_id uuid,
    date date NOT NULL,
    courier_name character varying(100),
    tracking_number character varying(100),
    notes text,
    status character varying(20) DEFAULT 'received'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.purchase_shipments OWNER TO postgres;

--
-- Name: quality_inspection_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quality_inspection_templates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    template_name character varying(100) NOT NULL,
    item_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.quality_inspection_templates OWNER TO postgres;

--
-- Name: quality_inspections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quality_inspections (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    inspection_number character varying(100) NOT NULL,
    inspection_type character varying(50) NOT NULL,
    item_id uuid NOT NULL,
    batch_no character varying(100),
    sample_size numeric(15,4) NOT NULL,
    status character varying(50) DEFAULT 'PENDING'::character varying NOT NULL,
    inspected_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.quality_inspections OWNER TO postgres;

--
-- Name: rental_billing_periods; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rental_billing_periods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rental_id uuid NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    period_type character varying(20) DEFAULT 'monthly'::character varying NOT NULL,
    total_operating_hours numeric(10,2) DEFAULT 0,
    total_standby_hours numeric(10,2) DEFAULT 0,
    total_overtime_hours numeric(10,2) DEFAULT 0,
    total_breakdown_hours numeric(10,2) DEFAULT 0,
    total_hm_km_usage numeric(12,2) DEFAULT 0,
    working_days integer DEFAULT 0,
    rate_basis character varying(20),
    hourly_rate numeric(15,2),
    minimum_hours numeric(10,2),
    overtime_multiplier numeric(5,2),
    standby_multiplier numeric(5,2),
    breakdown_penalty_per_day numeric(15,2),
    billable_hours numeric(10,2),
    shortfall_hours numeric(10,2) DEFAULT 0,
    base_amount numeric(18,2) DEFAULT 0,
    standby_amount numeric(18,2) DEFAULT 0,
    overtime_amount numeric(18,2) DEFAULT 0,
    breakdown_penalty_amount numeric(18,2) DEFAULT 0,
    mobilization_fee numeric(18,2) DEFAULT 0,
    demobilization_fee numeric(18,2) DEFAULT 0,
    other_charges numeric(18,2) DEFAULT 0,
    other_charges_description text,
    subtotal numeric(18,2) DEFAULT 0,
    discount_percentage numeric(5,2) DEFAULT 0,
    discount_amount numeric(18,2) DEFAULT 0,
    tax_percentage numeric(5,2) DEFAULT 11,
    tax_amount numeric(18,2) DEFAULT 0,
    total_amount numeric(18,2) DEFAULT 0,
    status character varying(20) DEFAULT 'draft'::character varying,
    invoice_number character varying(50),
    invoice_date date,
    due_date date,
    calculated_by uuid,
    calculated_at timestamp with time zone,
    approved_by uuid,
    approved_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    total_production_volume numeric(15,2) DEFAULT 0,
    unit_rate numeric(15,2),
    mechanical_availability numeric(5,2),
    physical_availability numeric(5,2),
    utilization_availability numeric(5,2),
    effective_utilization numeric(5,2),
    ma_threshold numeric(5,2) DEFAULT 85.00,
    availability_penalty numeric(15,2) DEFAULT 0,
    adjustment_notes text,
    adjusted_by uuid,
    adjusted_at timestamp with time zone,
    rental_item_id uuid,
    total_fuel_consumed numeric(10,2) DEFAULT 0,
    fuel_surcharge_rate numeric(10,2) DEFAULT 0,
    fuel_surcharge_amount numeric(10,2) DEFAULT 0
);


ALTER TABLE public.rental_billing_periods OWNER TO postgres;

--
-- Name: TABLE rental_billing_periods; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.rental_billing_periods IS 'Billing accumulation per period';


--
-- Name: COLUMN rental_billing_periods.mechanical_availability; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.rental_billing_periods.mechanical_availability IS 'MA = (Total Hours - Breakdown Hours) / Total Hours × 100';


--
-- Name: COLUMN rental_billing_periods.physical_availability; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.rental_billing_periods.physical_availability IS 'PA = (Working Hours + Standby Hours) / Total Hours × 100';


--
-- Name: COLUMN rental_billing_periods.utilization_availability; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.rental_billing_periods.utilization_availability IS 'UA = Working Hours / (Working Hours + Standby Hours) × 100';


--
-- Name: COLUMN rental_billing_periods.effective_utilization; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.rental_billing_periods.effective_utilization IS 'EU = Working Hours / Total Hours × 100';


--
-- Name: rental_billings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rental_billings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rental_id uuid NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    period_type character varying(20) DEFAULT 'monthly'::character varying,
    total_operating_hours numeric(10,2) DEFAULT 0,
    total_standby_hours numeric(10,2) DEFAULT 0,
    total_overtime_hours numeric(10,2) DEFAULT 0,
    total_breakdown_hours numeric(10,2) DEFAULT 0,
    total_hm_km_usage numeric(10,2) DEFAULT 0,
    working_days integer DEFAULT 0,
    rate_basis character varying(20) DEFAULT 'hourly'::character varying,
    hourly_rate numeric(15,2) DEFAULT 0,
    minimum_hours numeric(10,2) DEFAULT 200,
    overtime_multiplier numeric(5,2) DEFAULT 1.25,
    standby_multiplier numeric(5,2) DEFAULT 0.50,
    breakdown_penalty_per_day numeric(15,2) DEFAULT 0,
    billable_hours numeric(10,2) DEFAULT 0,
    shortfall_hours numeric(10,2) DEFAULT 0,
    base_amount numeric(15,2) DEFAULT 0,
    standby_amount numeric(15,2) DEFAULT 0,
    overtime_amount numeric(15,2) DEFAULT 0,
    breakdown_penalty_amount numeric(15,2) DEFAULT 0,
    mobilization_fee numeric(15,2) DEFAULT 0,
    demobilization_fee numeric(15,2) DEFAULT 0,
    other_charges numeric(15,2) DEFAULT 0,
    other_charges_description text,
    subtotal numeric(15,2) DEFAULT 0,
    discount_percentage numeric(5,2) DEFAULT 0,
    discount_amount numeric(15,2) DEFAULT 0,
    tax_percentage numeric(5,2) DEFAULT 11.0,
    tax_amount numeric(15,2) DEFAULT 0,
    total_amount numeric(15,2) DEFAULT 0,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    invoice_number character varying(50),
    invoice_date date,
    due_date date,
    calculated_by uuid,
    calculated_at timestamp with time zone,
    approved_by uuid,
    approved_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    total_production_volume numeric(15,2) DEFAULT 0,
    unit_rate numeric(15,2) DEFAULT NULL::numeric,
    mechanical_availability numeric(5,2),
    physical_availability numeric(5,2),
    utilization_availability numeric(5,2),
    effective_utilization numeric(5,2),
    ma_threshold numeric(5,2) DEFAULT 85.00,
    availability_penalty numeric(15,2) DEFAULT 0,
    adjustment_notes text,
    adjusted_by uuid,
    adjusted_at timestamp with time zone,
    rental_item_id uuid
);


ALTER TABLE public.rental_billings OWNER TO postgres;

--
-- Name: COLUMN rental_billings.mechanical_availability; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.rental_billings.mechanical_availability IS 'MA = (Total Hours - Breakdown Hours) / Total Hours × 100';


--
-- Name: COLUMN rental_billings.physical_availability; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.rental_billings.physical_availability IS 'PA = (Working Hours + Standby Hours) / Total Hours × 100';


--
-- Name: COLUMN rental_billings.utilization_availability; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.rental_billings.utilization_availability IS 'UA = Working Hours / (Working Hours + Standby Hours) × 100';


--
-- Name: COLUMN rental_billings.effective_utilization; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.rental_billings.effective_utilization IS 'EU = Working Hours / Total Hours × 100';


--
-- Name: COLUMN rental_billings.availability_penalty; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.rental_billings.availability_penalty IS 'Penalty applied when MA < threshold';


--
-- Name: rental_contracts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rental_contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_number character varying(50) NOT NULL,
    client_id uuid NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    auto_renew boolean DEFAULT false,
    renewal_notice_days integer DEFAULT 30,
    payment_terms character varying(20) DEFAULT 'NET_30'::character varying,
    price_lock boolean DEFAULT true,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    total_timesheets integer DEFAULT 0,
    total_operating_hours numeric(10,2) DEFAULT 0,
    total_standby_hours numeric(10,2) DEFAULT 0,
    total_breakdown_hours numeric(10,2) DEFAULT 0,
    mechanical_availability numeric(5,2),
    physical_availability numeric(5,2),
    utilization_availability numeric(5,2),
    effective_utilization numeric(5,2),
    kpi_calculated_at timestamp with time zone,
    contract_file_url text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid,
    approved_at timestamp with time zone,
    approved_by uuid,
    terminated_at timestamp with time zone,
    terminated_by uuid,
    termination_reason text,
    submitted_for_approval_at timestamp with time zone,
    delegated_to uuid,
    current_approval_step integer DEFAULT 0 NOT NULL,
    total_approval_steps integer DEFAULT 2 NOT NULL,
    template_id uuid,
    company_id uuid,
    CONSTRAINT valid_dates CHECK ((end_date > start_date)),
    CONSTRAINT valid_kpi_range CHECK ((((mechanical_availability IS NULL) OR ((mechanical_availability >= (0)::numeric) AND (mechanical_availability <= (100)::numeric))) AND ((physical_availability IS NULL) OR ((physical_availability >= (0)::numeric) AND (physical_availability <= (100)::numeric))) AND ((utilization_availability IS NULL) OR ((utilization_availability >= (0)::numeric) AND (utilization_availability <= (100)::numeric))) AND ((effective_utilization IS NULL) OR ((effective_utilization >= (0)::numeric) AND (effective_utilization <= (100)::numeric)))))
);


ALTER TABLE public.rental_contracts OWNER TO postgres;

--
-- Name: TABLE rental_contracts; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.rental_contracts IS 'Rental contract management with lifecycle tracking and performance metrics';


--
-- Name: COLUMN rental_contracts.mechanical_availability; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.rental_contracts.mechanical_availability IS 'MA % - Calculated from timesheets: (Available Hours / Total Hours) * 100';


--
-- Name: COLUMN rental_contracts.physical_availability; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.rental_contracts.physical_availability IS 'PA % - Physical presence availability';


--
-- Name: COLUMN rental_contracts.utilization_availability; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.rental_contracts.utilization_availability IS 'UA % - Utilization rate during contract';


--
-- Name: COLUMN rental_contracts.effective_utilization; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.rental_contracts.effective_utilization IS 'EU % - Effective utilization including quality metrics';


--
-- Name: COLUMN rental_contracts.current_approval_step; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.rental_contracts.current_approval_step IS 'Current step in approval workflow (0-N)';


--
-- Name: COLUMN rental_contracts.total_approval_steps; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.rental_contracts.total_approval_steps IS 'Total required approval steps';


--
-- Name: rental_details; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rental_details (
    asset_id uuid NOT NULL,
    rate_per_hour numeric(15,2),
    rate_per_day numeric(15,2),
    rate_per_month numeric(15,2),
    minimum_rental_period integer DEFAULT 1,
    operator_required boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.rental_details OWNER TO postgres;

--
-- Name: rental_handovers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rental_handovers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rental_id uuid NOT NULL,
    handover_type character varying(20) NOT NULL,
    condition_rating character varying(20),
    condition_notes text,
    photos jsonb DEFAULT '[]'::jsonb,
    has_damage boolean DEFAULT false,
    damage_description text,
    damage_photos jsonb DEFAULT '[]'::jsonb,
    recorded_by uuid,
    recorded_at timestamp with time zone DEFAULT now(),
    signature_data text,
    created_at timestamp with time zone DEFAULT now(),
    rental_item_id uuid,
    CONSTRAINT rental_handovers_condition_rating_check CHECK (((condition_rating)::text = ANY ((ARRAY['excellent'::character varying, 'good'::character varying, 'fair'::character varying, 'poor'::character varying])::text[]))),
    CONSTRAINT rental_handovers_handover_type_check CHECK (((handover_type)::text = ANY ((ARRAY['dispatch'::character varying, 'return'::character varying])::text[])))
);


ALTER TABLE public.rental_handovers OWNER TO postgres;

--
-- Name: TABLE rental_handovers; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.rental_handovers IS 'Condition documentation during dispatch and return';


--
-- Name: rental_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rental_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rental_id uuid NOT NULL,
    asset_id uuid NOT NULL,
    rental_rate_id uuid,
    rate_amount numeric(15,2),
    rate_basis character varying(20),
    status character varying(30) DEFAULT 'requested'::character varying NOT NULL,
    start_date date,
    expected_end_date date,
    actual_end_date date,
    dispatched_by uuid,
    dispatched_at timestamp with time zone,
    returned_by uuid,
    returned_at timestamp with time zone,
    subtotal numeric(15,2) DEFAULT 0,
    penalty_amount numeric(15,2) DEFAULT 0,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    mob_demob_cost numeric(20,2) DEFAULT 0,
    is_fuel_included boolean DEFAULT false
);


ALTER TABLE public.rental_items OWNER TO postgres;

--
-- Name: rental_rates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rental_rates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    category_id uuid,
    asset_id uuid,
    rate_type character varying(20) NOT NULL,
    rate_amount numeric(15,2) NOT NULL,
    currency character varying(10) DEFAULT 'IDR'::character varying,
    minimum_duration integer DEFAULT 1,
    deposit_percentage numeric(5,2) DEFAULT 0,
    late_fee_per_day numeric(15,2) DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    rate_basis character varying(20) DEFAULT 'hourly'::character varying,
    minimum_hours numeric(10,2) DEFAULT 200,
    overtime_multiplier numeric(5,2) DEFAULT 1.25,
    standby_multiplier numeric(5,2) DEFAULT 0.50,
    breakdown_penalty_per_day numeric(15,2) DEFAULT 0,
    hours_per_day numeric(5,2) DEFAULT 8,
    days_per_month integer DEFAULT 25,
    ma_threshold numeric(5,2) DEFAULT 85.00,
    availability_penalty_multiplier numeric(5,2) DEFAULT 1.0,
    fuel_surcharge_rate numeric(20,2) DEFAULT 0,
    tier_config jsonb
);


ALTER TABLE public.rental_rates OWNER TO postgres;

--
-- Name: TABLE rental_rates; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.rental_rates IS 'Pricing configuration for asset rentals by category or specific asset';


--
-- Name: COLUMN rental_rates.rate_basis; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.rental_rates.rate_basis IS 'Calculation basis: hourly, daily, monthly';


--
-- Name: COLUMN rental_rates.minimum_hours; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.rental_rates.minimum_hours IS 'Minimum billable hours per month';


--
-- Name: COLUMN rental_rates.overtime_multiplier; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.rental_rates.overtime_multiplier IS 'Multiplier for overtime hours (e.g. 1.25 = 125%)';


--
-- Name: COLUMN rental_rates.standby_multiplier; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.rental_rates.standby_multiplier IS 'Multiplier for standby hours (e.g. 0.5 = 50%)';


--
-- Name: COLUMN rental_rates.breakdown_penalty_per_day; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.rental_rates.breakdown_penalty_per_day IS 'Penalty charged per day of equipment breakdown';


--
-- Name: rental_timesheets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rental_timesheets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rental_id uuid NOT NULL,
    work_date date NOT NULL,
    start_time time without time zone,
    end_time time without time zone,
    operating_hours numeric(5,2) DEFAULT 0,
    standby_hours numeric(5,2) DEFAULT 0,
    overtime_hours numeric(5,2) DEFAULT 0,
    breakdown_hours numeric(5,2) DEFAULT 0,
    hm_km_start numeric(12,2),
    hm_km_end numeric(12,2),
    hm_km_usage numeric(12,2),
    operation_status character varying(30) DEFAULT 'operating'::character varying NOT NULL,
    breakdown_reason text,
    work_description text,
    work_location character varying(255),
    photos jsonb DEFAULT '[]'::jsonb,
    checker_id uuid,
    checker_at timestamp with time zone,
    checker_notes text,
    verifier_id uuid,
    verifier_at timestamp with time zone,
    verifier_status character varying(20) DEFAULT 'pending'::character varying,
    verifier_notes text,
    client_pic_id uuid,
    client_approved_at timestamp with time zone,
    client_signature text,
    client_notes text,
    status character varying(20) DEFAULT 'draft'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    production_volume numeric(12,2) DEFAULT 0,
    production_unit character varying(20) DEFAULT 'BCM'::character varying,
    standby_start_time time without time zone,
    standby_end_time time without time zone,
    breakdown_start_time time without time zone,
    breakdown_end_time time without time zone,
    rental_item_id uuid,
    fuel_consumed_liters numeric(10,2) DEFAULT 0
);


ALTER TABLE public.rental_timesheets OWNER TO postgres;

--
-- Name: TABLE rental_timesheets; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.rental_timesheets IS 'Daily operation logs for rentals';


--
-- Name: rentals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rentals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rental_number character varying(50) NOT NULL,
    client_id uuid NOT NULL,
    status character varying(30) DEFAULT 'requested'::character varying NOT NULL,
    request_date date DEFAULT CURRENT_DATE NOT NULL,
    start_date date,
    expected_end_date date,
    actual_end_date date,
    subtotal numeric(15,2),
    deposit_amount numeric(15,2) DEFAULT 0,
    deposit_returned boolean DEFAULT false,
    penalty_amount numeric(15,2) DEFAULT 0,
    total_amount numeric(15,2),
    requested_by uuid,
    approved_by uuid,
    approved_at timestamp with time zone,
    rejection_reason text,
    agreement_document character varying(500),
    invoice_number character varying(100),
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    contract_id uuid
);


ALTER TABLE public.rentals OWNER TO postgres;

--
-- Name: TABLE rentals; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.rentals IS 'Main rental transactions tracking the full lifecycle';


--
-- Name: report_access_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.report_access_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_id uuid,
    definition_id uuid,
    user_id uuid,
    action character varying(50) NOT NULL,
    ip_address inet,
    accessed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.report_access_log OWNER TO postgres;

--
-- Name: report_definitions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.report_definitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    report_type character varying(50) NOT NULL,
    output_format character varying(20) DEFAULT 'pdf'::character varying,
    query_template text,
    parameters jsonb,
    layout_config jsonb,
    is_public boolean DEFAULT false,
    organization_id uuid,
    created_by uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.report_definitions OWNER TO postgres;

--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.role_permissions OWNER TO postgres;

--
-- Name: role_profile_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_profile_roles (
    role_profile_id uuid NOT NULL,
    role_id uuid NOT NULL
);


ALTER TABLE public.role_profile_roles OWNER TO postgres;

--
-- Name: role_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.role_profiles OWNER TO postgres;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    is_system boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    role_level integer DEFAULT 5
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: sales_invoice_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_invoice_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    invoice_id uuid NOT NULL,
    description text NOT NULL,
    quantity numeric(15,4) DEFAULT 1 NOT NULL,
    unit_price numeric(20,4) DEFAULT 0 NOT NULL,
    total_price numeric(20,4) DEFAULT 0 NOT NULL,
    account_id uuid,
    source_type character varying(50),
    source_id uuid,
    source_line_id uuid
);


ALTER TABLE public.sales_invoice_items OWNER TO postgres;

--
-- Name: sales_invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_invoices (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    invoice_number character varying(50) NOT NULL,
    client_id uuid NOT NULL,
    date date NOT NULL,
    due_date date,
    subject text,
    message text,
    subtotal numeric(20,4) DEFAULT 0 NOT NULL,
    discount numeric(20,4) DEFAULT 0 NOT NULL,
    tax numeric(20,4) DEFAULT 0 NOT NULL,
    total_amount numeric(20,4) DEFAULT 0 NOT NULL,
    amount_paid numeric(20,4) DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    created_by uuid,
    journal_entry_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    attachment_url text,
    company_id uuid,
    custom_data jsonb DEFAULT '{}'::jsonb NOT NULL
);


ALTER TABLE public.sales_invoices OWNER TO postgres;

--
-- Name: sales_order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_order_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_id uuid NOT NULL,
    description text NOT NULL,
    quantity numeric(15,4) DEFAULT 1 NOT NULL,
    unit_price numeric(20,4) DEFAULT 0 NOT NULL,
    total_price numeric(20,4) DEFAULT 0 NOT NULL,
    account_id uuid
);


ALTER TABLE public.sales_order_items OWNER TO postgres;

--
-- Name: sales_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_orders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_number character varying(50) NOT NULL,
    quote_id uuid,
    client_id uuid NOT NULL,
    date date NOT NULL,
    delivery_date date,
    subject text,
    message text,
    subtotal numeric(20,4) DEFAULT 0 NOT NULL,
    discount numeric(20,4) DEFAULT 0 NOT NULL,
    tax numeric(20,4) DEFAULT 0 NOT NULL,
    total_amount numeric(20,4) DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sales_orders OWNER TO postgres;

--
-- Name: sales_quote_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_quote_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    quote_id uuid NOT NULL,
    description text NOT NULL,
    quantity numeric(15,4) DEFAULT 1 NOT NULL,
    unit_price numeric(20,4) DEFAULT 0 NOT NULL,
    total_price numeric(20,4) DEFAULT 0 NOT NULL,
    account_id uuid
);


ALTER TABLE public.sales_quote_items OWNER TO postgres;

--
-- Name: sales_quotes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_quotes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    quote_number character varying(50) NOT NULL,
    client_id uuid NOT NULL,
    date date NOT NULL,
    expiry_date date,
    subject text,
    message text,
    subtotal numeric(20,4) DEFAULT 0 NOT NULL,
    discount numeric(20,4) DEFAULT 0 NOT NULL,
    tax numeric(20,4) DEFAULT 0 NOT NULL,
    total_amount numeric(20,4) DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sales_quotes OWNER TO postgres;

--
-- Name: sales_shipment_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_shipment_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    shipment_id uuid NOT NULL,
    order_item_id uuid,
    description text NOT NULL,
    quantity_shipped numeric(15,4) DEFAULT 1 NOT NULL,
    source_type character varying(50),
    source_id uuid,
    source_line_id uuid
);


ALTER TABLE public.sales_shipment_items OWNER TO postgres;

--
-- Name: sales_shipments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_shipments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    shipment_number character varying(50) NOT NULL,
    sales_order_id uuid,
    client_id uuid,
    date date NOT NULL,
    courier_name character varying(100),
    tracking_number character varying(100),
    recipient_name character varying(100),
    address text,
    notes text,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sales_shipments OWNER TO postgres;

--
-- Name: saved_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.saved_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    definition_id uuid,
    name character varying(255) NOT NULL,
    parameters jsonb,
    file_path character varying(500),
    file_size integer,
    output_format character varying(20),
    generated_by uuid,
    generated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    generation_time_ms integer,
    is_scheduled boolean DEFAULT false,
    schedule_cron character varying(100),
    next_run_at timestamp with time zone,
    status character varying(50) DEFAULT 'completed'::character varying,
    error_message text
);


ALTER TABLE public.saved_reports OWNER TO postgres;

--
-- Name: sensor_aggregates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sensor_aggregates (
    asset_id uuid NOT NULL,
    sensor_id character varying(100) NOT NULL,
    period_type character varying(10) NOT NULL,
    period_start timestamp with time zone NOT NULL,
    min_value double precision,
    max_value double precision,
    avg_value double precision,
    sum_value double precision,
    count_readings integer
);


ALTER TABLE public.sensor_aggregates OWNER TO postgres;

--
-- Name: sensor_alerts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sensor_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_id uuid NOT NULL,
    sensor_id character varying(100) NOT NULL,
    threshold_id uuid,
    alert_type character varying(50) NOT NULL,
    severity character varying(20) NOT NULL,
    sensor_value double precision,
    threshold_value double precision,
    status character varying(20) DEFAULT 'active'::character varying,
    acknowledged_by uuid,
    acknowledged_at timestamp with time zone,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    resolution_notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sensor_alerts OWNER TO postgres;

--
-- Name: sensor_readings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sensor_readings (
    "time" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    asset_id uuid NOT NULL,
    sensor_id character varying(100) NOT NULL,
    temperature double precision,
    humidity double precision,
    vibration_x double precision,
    vibration_y double precision,
    vibration_z double precision,
    pressure double precision,
    power_consumption double precision,
    custom_value double precision,
    unit character varying(20),
    status_code integer,
    quality character varying(20)
);


ALTER TABLE public.sensor_readings OWNER TO postgres;

--
-- Name: sensor_thresholds; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sensor_thresholds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_id uuid NOT NULL,
    sensor_type character varying(50) NOT NULL,
    min_value double precision,
    max_value double precision,
    warning_min double precision,
    warning_max double precision,
    alert_enabled boolean DEFAULT true,
    alert_delay_seconds integer DEFAULT 60,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sensor_thresholds OWNER TO postgres;

--
-- Name: settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.settings (
    key character varying(255) NOT NULL,
    value jsonb NOT NULL,
    description text,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid
);


ALTER TABLE public.settings OWNER TO postgres;

--
-- Name: stock_ledger_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_ledger_entries (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    warehouse_id uuid NOT NULL,
    item_id uuid NOT NULL,
    posting_date date NOT NULL,
    posting_datetime timestamp with time zone DEFAULT now() NOT NULL,
    actual_qty_delta numeric(15,4) NOT NULL,
    qty_after numeric(15,4) NOT NULL,
    valuation_rate numeric(18,6) DEFAULT 0.000000 NOT NULL,
    stock_value_delta numeric(20,4) DEFAULT 0.0000 NOT NULL,
    stock_value_after numeric(20,4) DEFAULT 0.0000 NOT NULL,
    voucher_type character varying(50) NOT NULL,
    voucher_no character varying(100) NOT NULL,
    voucher_id uuid NOT NULL,
    voucher_line_id uuid,
    batch_no character varying(100),
    serial_no character varying(100),
    is_cancelled boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid
);


ALTER TABLE public.stock_ledger_entries OWNER TO postgres;

--
-- Name: stock_reservations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_reservations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    warehouse_id uuid NOT NULL,
    item_id uuid NOT NULL,
    reserved_qty numeric(15,4) NOT NULL,
    voucher_type character varying(50) NOT NULL,
    voucher_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.stock_reservations OWNER TO postgres;

--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.support_tickets (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    ticket_number character varying(100) NOT NULL,
    subject character varying(200) NOT NULL,
    priority character varying(50) DEFAULT 'MEDIUM'::character varying NOT NULL,
    status character varying(50) DEFAULT 'OPEN'::character varying NOT NULL,
    asset_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.support_tickets OWNER TO postgres;

--
-- Name: system_backup_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_backup_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id uuid,
    backup_name character varying(255) NOT NULL,
    size_bytes bigint DEFAULT 0 NOT NULL,
    backup_status character varying(50) DEFAULT 'COMPLETED'::character varying NOT NULL,
    restore_verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.system_backup_logs OWNER TO postgres;

--
-- Name: system_health_checks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_health_checks (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    node_id character varying(100) NOT NULL,
    service_name character varying(100) NOT NULL,
    status character varying(50) DEFAULT 'HEALTHY'::character varying NOT NULL,
    latency_ms integer DEFAULT 0 NOT NULL,
    checked_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.system_health_checks OWNER TO postgres;

--
-- Name: system_job_locks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_job_locks (
    job_name character varying(100) NOT NULL,
    locked_by character varying(100) NOT NULL,
    locked_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL
);


ALTER TABLE public.system_job_locks OWNER TO postgres;

--
-- Name: tenant_provisioning_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tenant_provisioning_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id uuid NOT NULL,
    site_domain character varying(255) NOT NULL,
    provision_status character varying(50) DEFAULT 'INITIATED'::character varying NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone
);


ALTER TABLE public.tenant_provisioning_logs OWNER TO postgres;

--
-- Name: timesheets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.timesheets (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    project_task_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    work_date date NOT NULL,
    hours numeric(5,2) NOT NULL,
    is_billable boolean DEFAULT true NOT NULL,
    status character varying(50) DEFAULT 'SUBMITTED'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.timesheets OWNER TO postgres;

--
-- Name: units; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.units (
    id integer NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(100) NOT NULL
);


ALTER TABLE public.units OWNER TO postgres;

--
-- Name: units_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.units_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.units_id_seq OWNER TO postgres;

--
-- Name: units_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.units_id_seq OWNED BY public.units.id;


--
-- Name: user_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    allow_doctype character varying(100) NOT NULL,
    for_value character varying(255) NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_permissions OWNER TO postgres;

--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    organization_id uuid,
    granted_by uuid,
    granted_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp with time zone
);


ALTER TABLE public.user_roles OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'staff'::character varying NOT NULL,
    department_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    organization_id uuid,
    role_id uuid,
    phone character varying(50),
    avatar_url text,
    department character varying(100),
    allowed_asset_group character varying(50)
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: vehicle_details; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vehicle_details (
    asset_id uuid NOT NULL,
    license_plate character varying(20),
    brand character varying(100),
    model character varying(100),
    color character varying(50),
    vin character varying(100),
    engine_number character varying(100),
    bpkb_number character varying(100),
    stnk_expiry date,
    kir_expiry date,
    tax_expiry date,
    fuel_type character varying(50),
    transmission character varying(50),
    capacity character varying(50),
    odometer_last bigint,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.vehicle_details OWNER TO postgres;

--
-- Name: vendors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vendors (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    contact_person character varying(255),
    phone character varying(50),
    email character varying(255),
    address text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    company_id uuid,
    payment_terms_days integer DEFAULT 30,
    currency character varying(3) DEFAULT 'IDR'::character varying,
    npwp character varying(30),
    nik character varying(30),
    tax_name character varying(150),
    tax_address text
);


ALTER TABLE public.vendors OWNER TO postgres;

--
-- Name: view_heavy_equipment_admin; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.view_heavy_equipment_admin AS
 SELECT a.id,
    a.asset_code,
    a.name,
    a.category_id,
    a.location_id,
    a.department_id,
    a.assigned_to,
    a.vendor_id,
    a.is_rental,
    a.asset_class,
    a.status,
    a.condition_id,
    a.serial_number,
    a.brand,
    a.model,
    a.year_manufacture,
    a.specifications,
    a.purchase_date,
    a.purchase_price,
    a.currency_id,
    a.unit_id,
    a.quantity,
    a.residual_value,
    a.useful_life_months,
    a.qr_code_url,
    a.notes,
    a.created_at,
    a.updated_at,
    a.organization_id
   FROM (public.assets a
     JOIN public.categories c ON ((a.category_id = c.id)))
  WHERE (((c.code)::text = 'HEAVY_EQ'::text) OR (c.parent_id IN ( SELECT categories.id
           FROM public.categories
          WHERE ((categories.code)::text = 'HEAVY_EQ'::text))));


ALTER VIEW public.view_heavy_equipment_admin OWNER TO postgres;

--
-- Name: view_infrastructure_admin; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.view_infrastructure_admin AS
 SELECT a.id,
    a.asset_code,
    a.name,
    a.category_id,
    a.location_id,
    a.department_id,
    a.assigned_to,
    a.vendor_id,
    a.is_rental,
    a.asset_class,
    a.status,
    a.condition_id,
    a.serial_number,
    a.brand,
    a.model,
    a.year_manufacture,
    a.specifications,
    a.purchase_date,
    a.purchase_price,
    a.currency_id,
    a.unit_id,
    a.quantity,
    a.residual_value,
    a.useful_life_months,
    a.qr_code_url,
    a.notes,
    a.created_at,
    a.updated_at,
    a.organization_id
   FROM (public.assets a
     JOIN public.categories c ON ((a.category_id = c.id)))
  WHERE (((c.code)::text = 'INFRASTRUCTURE'::text) OR (c.parent_id IN ( SELECT categories.id
           FROM public.categories
          WHERE ((categories.code)::text = 'INFRASTRUCTURE'::text))));


ALTER VIEW public.view_infrastructure_admin OWNER TO postgres;

--
-- Name: view_vehicles_admin; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.view_vehicles_admin AS
 SELECT a.id,
    a.asset_code,
    a.name,
    a.category_id,
    a.location_id,
    a.department_id,
    a.assigned_to,
    a.vendor_id,
    a.is_rental,
    a.asset_class,
    a.status,
    a.condition_id,
    a.serial_number,
    a.brand,
    a.model,
    a.year_manufacture,
    a.specifications,
    a.purchase_date,
    a.purchase_price,
    a.currency_id,
    a.unit_id,
    a.quantity,
    a.residual_value,
    a.useful_life_months,
    a.qr_code_url,
    a.notes,
    a.created_at,
    a.updated_at,
    a.organization_id
   FROM (public.assets a
     JOIN public.categories c ON ((a.category_id = c.id)))
  WHERE (((c.code)::text = 'VEHICLES'::text) OR (c.parent_id IN ( SELECT categories.id
           FROM public.categories
          WHERE ((categories.code)::text = 'VEHICLES'::text))));


ALTER VIEW public.view_vehicles_admin OWNER TO postgres;

--
-- Name: warehouses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.warehouses (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    parent_id uuid,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_group boolean DEFAULT false NOT NULL,
    is_frozen boolean DEFAULT false NOT NULL,
    warehouse_type character varying(50) DEFAULT 'DEFAULT'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.warehouses OWNER TO postgres;

--
-- Name: work_experiences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.work_experiences (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    employee_id uuid NOT NULL,
    company_name character varying(255) NOT NULL,
    "position" character varying(100),
    start_date date,
    end_date date,
    description text,
    attachment_urls jsonb,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.work_experiences OWNER TO postgres;

--
-- Name: workflow_action_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workflow_action_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workflow_id uuid NOT NULL,
    document_id uuid NOT NULL,
    action_by_user_id uuid NOT NULL,
    from_state character varying(100) NOT NULL,
    action_name character varying(100) NOT NULL,
    to_state character varying(100) NOT NULL,
    comments text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.workflow_action_logs OWNER TO postgres;

--
-- Name: workflow_states; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workflow_states (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workflow_id uuid NOT NULL,
    state_name character varying(100) NOT NULL,
    doc_status integer DEFAULT 0 NOT NULL,
    allow_edit_role_id uuid,
    style_variant character varying(50) DEFAULT 'info'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.workflow_states OWNER TO postgres;

--
-- Name: workflow_transitions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workflow_transitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workflow_id uuid NOT NULL,
    state_id uuid NOT NULL,
    action_name character varying(100) NOT NULL,
    next_state_id uuid NOT NULL,
    allowed_role_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.workflow_transitions OWNER TO postgres;

--
-- Name: workflows; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workflows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workflow_name character varying(100) NOT NULL,
    doctype_id uuid NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    document_status_field character varying(100) DEFAULT 'workflow_state'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.workflows OWNER TO postgres;

--
-- Name: workstations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workstations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    workstation_name character varying(100) NOT NULL,
    hour_rate numeric(20,4) DEFAULT 0.0000 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.workstations OWNER TO postgres;

--
-- Name: asset_conditions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_conditions ALTER COLUMN id SET DEFAULT nextval('public.asset_conditions_id_seq'::regclass);


--
-- Name: currencies id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.currencies ALTER COLUMN id SET DEFAULT nextval('public.currencies_id_seq'::regclass);


--
-- Name: maintenance_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_types ALTER COLUMN id SET DEFAULT nextval('public.maintenance_types_id_seq'::regclass);


--
-- Name: units id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.units ALTER COLUMN id SET DEFAULT nextval('public.units_id_seq'::regclass);


--
-- Data for Name: _sqlx_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._sqlx_migrations (version, description, installed_on, success, checksum, execution_time) FROM stdin;
1	init schema	2026-07-28 06:53:48.129329+00	t	\\x706751b66b0ac5d33be17580c52feb5d4f87204a447ef5f6fda35d95cd260443acd6ddb0eaaea8d71216336d0bba80c8	103425629
2	add organizations	2026-07-28 06:53:48.236429+00	t	\\x8724694fa293d9d6482071c5eaec1be28e4cce81811fed247c5be60e6270a47141864620e4510fad493757c3677fe830	17152039
3	add loan management	2026-07-28 06:53:48.256212+00	t	\\x7d245528c91c5a1357199486cb144201f040923e4a0d5e10eefb72a393e1a8a7547800dce5565f9de12f241e128fd8a6	26939095
4	add work orders	2026-07-28 06:53:48.286035+00	t	\\xfeaf7156cd51a3796998e72bb526a847fca46aacab6101aa28541f32b63c1fc639a2b329db60afa9c26c6425fa482d70	34107813
5	add rbac	2026-07-28 06:53:48.322287+00	t	\\x95fff3010972ae09e749f2eb33c96fccadbbec926216bb7421aacd57ee6a86b2d9887b583720f38c115712f7ea2625aa	34611342
6	add audit enhancement	2026-07-28 06:53:48.360139+00	t	\\x6443ec99cff1132132fad510d6e6e1950d84d288e40e22407f8e94b66e2fd39b4ce4fdd22063a253d8d47ddecb9dc09d	26113482
7	add depreciation	2026-07-28 06:53:48.390081+00	t	\\x3e10f675dbc9808195f9c8c2fb524d38aee3a9d00ca8f13df18d6a24fd423b62f8f46adcb2c351170c84bf1e679409ef	31354168
8	add sensor data	2026-07-28 06:53:48.42428+00	t	\\x56cb1327b15a0caf85220a9d6e79159da03338df26c3bb026ec65eb97cc7e056420d779e00158014bf09d3f9d3ba1d01	34331151
9	add reports	2026-07-28 06:53:48.461373+00	t	\\xecdb1c6a0023a5de5cfe2b8a408e76b3b21cd8f2bebedf0b5daf88e97ceede841ca401186718e3f3ba553325d5c67d37	28553518
10	add notifications	2026-07-28 06:53:48.492183+00	t	\\xd53faea44d091f1d66c82d91e0d9c5f96c596af8ca905b5974a753b075442decc5bb1c81c663791974f6488cb3da0396	29829646
11	seed data	2026-07-28 06:53:48.524635+00	t	\\x63ec4cdbbc055cea8d0d87a91d22eb4dc6780ce2d1cf83ee12e0a4129465daf91d1fc3d3398c807aff0b4fb8e0794bf5	84515297
12	asset classification	2026-07-28 06:53:48.611895+00	t	\\xbffb5ecfc9faf2bb9df3b168cfe26c3e0061b9f54d7b437ca35003e3b6e394a963f6f6f72331bb55e50c72de9e1f2f23	26504213
13	enrich assets schema	2026-07-28 06:53:48.640516+00	t	\\x68745c31e08a686e90f84f5f5b6862a0d8c161b5f8d35d0dc15e5940009eaa29e6569d1b25de5d7d0c09d6932d97a3a1	28928618
14	enhanced rbac	2026-07-28 06:53:48.675848+00	t	\\x9543a6326c89fe00c75897c4938b99d48f6b32a1f2b655eccb1501670815fee7a4d2abf5af8e4acdd050736680647f27	40444277
15	work order rbac	2026-07-28 06:53:48.71845+00	t	\\x5e91b28bb43b4a8a39b266a3b1eeea3bce44bb095d84829314cd587ea11c8a72ebd2e53b8c0863604199130501c7d95a	30812282
16	add profile fields	2026-07-28 06:53:48.751599+00	t	\\x0519c8933f9bcb662a00ab8990e6df91e103d0dbd6fba95de099a29d7cb0cef2fcb2a41d75c6346b046d530cc09bcd9a	4118031
17	create audit tables	2026-07-28 06:53:48.75791+00	t	\\xe8ebe1c1dfd16025baa01976cc4987e8d192265639448217f1c51310881e1ece230b41bd39d4c40e67124ad5dbb361d8	11978677
18	asset lifecycle	2026-07-28 06:53:48.771984+00	t	\\x42f62508e98d7ee0c3a22ac1681e6a05111eece229512b6768dfefd4fb0dc5c2c3f0188f96199bdabc6012dd8dd13b42	36596554
19	comprehensive asset seed	2026-07-28 06:53:48.811427+00	t	\\x66d836ead2abcb0dfef8de5b6549c9aef0bd2379d695790716496844efcc78013ee84674c3337a25fde45741f066a1ee	3338541
20	create asset conversions	2026-07-28 06:53:48.816896+00	t	\\x571d8d4e05c4203ecfaa87578f46854eb9dd09f74029710e873ff7ad776c54450d62cd70fcb8813180f8c5b15918a201	11908073
21	create rental module	2026-07-28 06:53:48.83106+00	t	\\x9f07e3ed1637de04c57e8f99ca8c673fdfc8268c22932d96d19c068e3170debda6c692fc3b7ec3f911db86bbf06437a6	49411263
22	enhance rental module	2026-07-28 06:53:48.882814+00	t	\\xc8b66201ae5fbafc2f95e3acf3115735c27fd5d09163651b83a247b6d817b6f613702349a481cf3630b83f3e2fd561f1	55891640
23	add department to users assets categories	2026-07-28 06:53:48.940947+00	t	\\x25efc50967a6c59cb6045d639ccf11d05935dcac707a329328e561591e82a4f82683bffb97ab46db5da087c0eb3f6b10	4181609
24	add location id to work orders	2026-07-28 06:53:48.947079+00	t	\\xf60878d4685e55591c5d36f452da074d2e3f64d105e07ab71945ddd4625d7d0171a3891f484e5404b0e39b0008fa6647	3890076
25	add changed fields to audit logs	2026-07-28 06:53:48.952884+00	t	\\x6801c05c059e82b70913e152211ae024d4e08a629a4de753f69d871a0a4dfb32dfa3028aaaae29c9244fd783e922271c	3562518
26	add specialist users	2026-07-28 06:53:48.958494+00	t	\\x2ea0bacb643a52e24099b5d38972741fe62129dbea1b3f950045722ebbba778077b2d6700b7943d9a4e648c2482176e9	14502176
27	add remaining users	2026-07-28 06:53:48.974973+00	t	\\xfaeb7090c62e1d8b88283a08ae8eff3f4bf120021ec262f75987b4559afeb1f117e39db3da10f9198a625523ddc9f73d	8507624
28	add employees	2026-07-28 06:53:48.985553+00	t	\\x8bd01a4645457ec539f7d74416d7b7a3e75febf3218b338777a06ed914a1ca175cf9b9ceeacd6f6764b67db28e22df47	14437635
29	link loans to employees	2026-07-28 06:53:49.002036+00	t	\\x460f82ebaac05cd054dd6b3fd56a28e266583d52d60607e010c69896a324d5dc366595d4b9857a05222ae673a42ecd92	5149316
30	seed employees	2026-07-28 06:53:49.009037+00	t	\\x1e7cec27bf100f10e1f2d0e8f55c21f19ab82f776850d5fc6fea0aebf2dcdcf2a88424a9be0ab8c06c96e01c7db958fb	29610914
31	seed more employees	2026-07-28 06:53:49.040903+00	t	\\x6d8689a29c933be2aa2a20c9077e34a21a3ab995f47ad5cdb7a3a2533d48e1852c71e88a3a5a8fb7240f305a669559aa	15059522
32	update emp name demo	2026-07-28 06:53:49.058062+00	t	\\x23ee1b3e28bdd423f34c5f8042a2dbca626b923ed8f412f3c1a24bdf1e569200b3f373f84953bff870703a81a0c60af3	3443740
33	add location details	2026-07-28 06:53:49.063601+00	t	\\x7bf9afbb2cf2e84f3e8e202fdfb493aaf20b49199020bfb3ae2c54387cee65031ae7f881680eed0b33512e0c47ad9a0c	6788347
34	add description to departments	2026-07-28 06:53:49.072595+00	t	\\x45b89cf616583b1da91be411ede988c587b082aadf4f2b3ad99f306eac6e4d971d83b7ed4348d47a53c7306f1f30e631	4782087
35	hrd attendance module	2026-07-28 06:53:49.079692+00	t	\\xfcf81eceed5167f635e14386e93d7e82cd5169b562d9544d69fe71576057bb19701dfcf3f1900e28cc1011b767eaf2bd	66167482
36	add performance indexes	2026-07-28 06:53:49.148186+00	t	\\x4f30694b3d841d42afe9c0d47a97f81327bd90e4d2e287b0defc2267fb7e82a7e6e79983416935aefa3d9ca1f56de09e	28260147
37	create chart of accounts	2026-07-28 06:53:49.178935+00	t	\\x3f5c4ec626af7a9222bd28e11e55f9a123deb3b11e6187acce219d3387f1c22fdecf6cabcf3f4565f2f57925c3f29c32	11337091
38	seed coa	2026-07-28 06:53:49.19241+00	t	\\xca34a7f1527c9c53235c85597c6e9e650241542c54cfbc1a61b0bef22482ad4632324582780353c433696a2ff8de9626	29750678
39	fix coa constraints	2026-07-28 06:53:49.224358+00	t	\\xb9ecfab15638cbca699d97c02aa90e7ad20e2600bfea43ff1bf998653975adc8d7c7dac8c11a67f48a6a41adec900e32	4549800
40	create journal entries	2026-07-28 06:53:49.231078+00	t	\\x830a011988aff2a87b952c4595fee39b0da3679c9d149c77cb0261cbf7689ee7dd08d309e75c9e4dbf83ef6590b6b5f3	18293621
41	create kledo finance tables	2026-07-28 06:53:49.251818+00	t	\\xaf8b177b4a637278ef3b987cd0568a9a4cae3cb121ba9ff230ce93016b3b336939b1b3573eeed4744a7de9905c3d3b02	55253607
42	create sales tables	2026-07-28 06:53:49.310156+00	t	\\x05e4807167f7d55ba318490c9901c8fe3e8252b25994a7afd87a51de11b27890fd0dda9c0873920edbdf35b28828747e	40917039
43	create purchase tables	2026-07-28 06:53:49.353701+00	t	\\xf1f5b023abd9f93fab45994c5f5dc6c4307f0c0aadfc2e5c6b11b5c6dd4c461a54c43c3fcb3501e567da463b7b11be42	28568443
44	add work order parts	2026-07-28 06:53:49.384387+00	t	\\xbe448dd2c32ecc20e126108a10e04026dfb4638cc100c1c101e17d4ef94bc14c3b22d0834c287805914091adec098e75	8830685
45	fix orphan rental asset	2026-07-28 06:53:49.395307+00	t	\\x8d07d51e8b4aec10e838c14a4692a9991e4508d56943ca2a0f250006d3c3406c0d9156bd7744586232fa846a93490748	4397859
46	delete bad lifecycle history	2026-07-28 06:53:49.402093+00	t	\\xb496a5880cde6f8685ca6736f26283ae4648194a98bf3925ea112e10739270a2ffc6ebee981a1beac72d433c6318397c	4364746
47	create fuel module	2026-07-28 06:53:49.408652+00	t	\\x673ba19754808e646ee41edfa34d883adb917b735c01988047110f5686d4437e8c14c2b76538d06f7ec86af301c63ccd	18968140
48	create rental billings	2026-07-28 06:53:49.429654+00	t	\\xad5ec1f7df82a4012d28c1ae27b0d7c32050fc1d41f4d99e81292b2ede95192cccc973aa681ee05e603bbab9b94149d9	24212595
49	add photos to loans	2026-07-28 06:53:49.455941+00	t	\\xa0ad4d5a50c1ed279306f6dd509dca31f7944d4040be60a271dd07309528ff5efc73e374536634b676adaec163b7e305	4072200
50	add is fuel to assets	2026-07-28 06:53:49.462172+00	t	\\x3b225ce36fa57caee5550375e6e837c63288d31df45d1bab834dd7cfbb8f8466d8bd164a7b67c1c5239b113103c8fe32	7246669
51	add asset sale fields	2026-07-28 06:53:49.471356+00	t	\\xd02c452ff94534b76d1dea5fe6fa4c7a1bf7b8b52a18114a12487d873f2bb1262a13b981c5a9896f782a32187d1f73cf	4003661
52	merge conversion to work order	2026-07-28 06:53:49.477124+00	t	\\x8f28cf10f8ce289284cc6d0d10687e94013a319f6cfb59b74db767fb61ad6601ffcc31641d76cf77f6837c827cb66c22	5083697
53	update loan photos to arrays	2026-07-28 06:53:49.484136+00	t	\\xe55c2b36a7211935cc733b8fb3a85a5bc225a8174bb51920f8ce5c60e7684ad778b6739b089932eaeaebe1602542be60	18266810
54	fix specialized admin asset permissions	2026-07-28 06:53:49.504433+00	t	\\x7baf32fbb08c26dd3f30e5f9e25cf13dcfb5094cc4560c91c955eee6a6ed569b360bd4a349f4268894afa5816bd2f95f	7974282
55	add photos to assets	2026-07-28 06:53:49.514149+00	t	\\xbcc7e1445876de46db4379002bfe89d2cb12863e4156035ab2a2e8d1a3085ad5430c90bf9d89904babd3b2b3df29f8db	3880488
20240523000001	add employee assignment fields	2026-07-28 06:53:49.519832+00	t	\\xb04bd041a142b9ab416c5560b06803aa30d5667cb0dc091802fddc8dec4385cc18fa421f0801811cec026b2a74b8bf31	6801486
20260115143055	add category attribute templates	2026-07-28 06:53:49.528402+00	t	\\xbe4ea1b0cc3283e7b7926938c68af7d95e28c33b755203cee4431ff174bcf6fffdd281d37eacb3d24572a7887b564ff5	9061342
20260115145800	seed category templates	2026-07-28 06:53:49.539308+00	t	\\x02442021b70a299e7cea09b4ac5cd17c5923d6a2d67d117d79f8a005005203bc55c91c49e6e0e3714543aa810e922732	8177397
20260115150600	update vehicle template	2026-07-28 06:53:49.549322+00	t	\\x113ae778b0ad90924da578aa88c10a48ed79aba49eaeef4371bf944c9b35c32b113ce6561167baefd076ab1476d95a4d	5784994
20260116120000	seed category attributes	2026-07-28 06:53:49.556892+00	t	\\x40857809d1e00c1bf2b2762614ec2947ca99fdea6ddf7dbf9988fb08559417742282d424c5dd41366778372f762e63d5	19251248
20260120000000	add bcm support	2026-07-28 06:53:49.578031+00	t	\\xc81adf06b28ed990336fadb4d162b250a71d41c250c1309a0f38d224ac11b198d9259ba8e19acf5db1bddb363463cf93	5906538
20260120051435	add timesheet detail times	2026-07-28 06:53:49.585853+00	t	\\x13575e2181a4c786276d0b9105b8a500fb1ed18dbacce9694abff611242b43852bc5fe3007be38b3ebbbf808587fbe2d	3872157
20260120124102	create rental contracts table	2026-07-28 06:53:49.591458+00	t	\\xf0f9b2274a3d0ed478b7a437abdf431cc13cabe0a06ba421e51812fbbb5cbe48014fc31267fdce2b8947e988dddbe1f9	30806423
20260120150000	fix bcm billings	2026-07-28 06:53:49.624313+00	t	\\x4da228d26d11b0e3de1ee403169e6b1476a1f04909f9d9611070da98d2a24b5bb6d912bc8b954138d9727db91fcb8510	3840308
20260120160000	add rate basis to rentals	2026-07-28 06:53:49.630086+00	t	\\x93631cb5dec7b243d0292f7aa616d7f057ddc619c8fbbc94f73bc11ed1082c33594584e72eb24af2f7976d2a61ea8ab6	10469144
20260120170000	add unit rate to billing periods	2026-07-28 06:53:49.642466+00	t	\\x230040a21d02cd244035009e08731cf6e8c4ce4ee1b83eadcc6f1f5aaa4a59424891c4eced5842c4de93efaf79e41a32	4334760
20260120180000	add unit rate to rental billings	2026-07-28 06:53:49.648514+00	t	\\xedfd2816d33ae5a940092e62842a6f1bbb0cb6b81273716906b4f359f46871642a8def2a8723a5922f3b23d8ac9e7c68	4427355
20260120190000	add kpi billing fields	2026-07-28 06:53:49.654759+00	t	\\x19d48ab8915be0af0fafe20e0faf6e7e2603b450d62872efcf91da31452a8ca7ca8b081c5f7efeb53652e44d815e832d	10651763
20260120192000	add kpi to billing periods	2026-07-28 06:53:49.667566+00	t	\\x92615df4ed2aa0bb9ba43072d2f6fab91831b8525cbd32311f71bd4640feea468fd6d3297c1c302bf2fc95ecc335d3c2	10986834
20260120200000	add is rentable to assets	2026-07-28 06:53:49.680824+00	t	\\x2f79c59cee8520a7a302e41bf90e8d0d05b9a48335d34bf71453a562b384efb8814dedf4e8d7d086a65ac81f056333d9	9892756
20260120210000	fix rate type constraint	2026-07-28 06:53:49.694579+00	t	\\x4c3be0ee9b86464706987fcb8962601e2197f559e671b51711b4f512d7f2c64f7c7399b7661f52c92f342dfd827d5988	5591419
20260120220000	multi asset rental	2026-07-28 06:53:49.703667+00	t	\\xbf8ca37739a36f2a1c7875ede47c1b688a4313baa85c0dc02e9f6bf13b28a08155410da1d6a77a2f23977656ebf47b43	34805172
20260120223000	update timesheets multi asset	2026-07-28 06:53:49.740796+00	t	\\x160adb0be58f491ae4774d0cf84d7ba44a92ab52960aab803deed938c848b18be966a71f703576001bb78644494220e8	7218063
20260120230000	add item id to periods	2026-07-28 06:53:49.749993+00	t	\\x2ed20fe926a1c4a8febcbb6295702a18e898001a1d561f055ebe324e2bf5d8d29f9b906bb705a862faf2207ecd6e216d	6377410
20260120233000	cleanup rentals	2026-07-28 06:53:49.758188+00	t	\\x9ac590d2e6b3d1cf5d6a22744a0538139307fced9d5d6e0265c6d9fa876fd06ca5fe08797a524139578f93df71b82b30	4167543
20260120234154	add advanced billing rules	2026-07-28 06:53:49.76416+00	t	\\x56c06a07404a9020e92cbcef57bf465789968bd2899f964a90ce5c08fabe866bbc6d2e667aa5c52a95529fcb8e7a1e27	6023518
20260120234444	add fuel to timesheets	2026-07-28 06:53:49.772361+00	t	\\xc46eae25bfadca165ded8366c61764dbdc888d1463471aa961f2de72e545201e98c68e05c704b240654165f3ffa763fa	4159486
20260120234553	add fuel to billing periods	2026-07-28 06:53:49.778695+00	t	\\xbfa33692575a9ce62990f8f067b3241effe44efa2fc3430e1e299c04ea9a30eda412aa3f8e4a69164bc560dd4d78b0fb	5521400
20260121000000	fix billing constraint	2026-07-28 06:53:49.786382+00	t	\\x9465c43b1aef6bd790c0721c7f7903698e8c2aba2549c066b4d4ad353cf3245e031ca3baeb429502570802d0b91b54d4	5161594
20260121133000	seed heavy fleet	2026-07-28 06:53:49.793435+00	t	\\x268d4fd67ba4bff55b1b96a160104f93eb2552e339e2a0195d39198880341b3e5dcb2c6038ff9e088bd9cfe20a665756	28198284
20260121134000	seed sample loan	2026-07-28 06:53:49.823749+00	t	\\x0f99d3842499bb917312aa5cb9182bc5d8d987e121f43d81f1279bbdee689a70b0e021483b5e2ea2dee58e395ad9cb08	9271968
20260121140000	reset passwords	2026-07-28 06:53:49.83499+00	t	\\xf516aec2c16aa4b2d22692b1b5608bb1e6c99ca39034634e39615cc62eda2cf3aa839deca2342bcdbfcb8b275f05123d	4248961
20260122000000	add is loan to assets	2026-07-28 06:53:49.841066+00	t	\\x90d8559ee79de0f668f389e4b216c3b0270a8082dae9b9d0d13e2b809d7693effcbe24233f826ff32fca9c176fd1d51b	4011931
20260122213800	create contract documents	2026-07-28 06:53:49.847042+00	t	\\x63b4f44a4b8e844af732821aa432a1f6c5a4d6e0fee36fde2470bf5906fb2d5a59d72407bdc961e881e7b666f706a4b4	20409182
20260123000000	create contract renewals	2026-07-28 06:53:49.869908+00	t	\\xe664f4fe4ac1845fa851b6211748889e0af156b2ff03189521054f39b9620cd0ddcf6e8df259f4ddbe9f701a02747474	13516716
20260123014500	create contract approvals	2026-07-28 06:53:49.885599+00	t	\\x8d17d3213fb6ffc453bf9b16ab02aa0a0bfa861fa9fe8801afee407566f39af6277960abb3746050699dade5188f20f9	13163377
20260123125454	add delegation to contracts	2026-07-28 06:53:49.900902+00	t	\\x1b2e35adaaf87e8ae633cb549262053e15ae6375f27f71c088ebf0d929841af59ffbe0fde7d4ef2018dd4eaf9eb638f9	5454410
20260124100000	multilevel contract approvals	2026-07-28 06:53:49.908191+00	t	\\xa0cafeb62ab15689398a62487fb5c6e55d28c41114eac078bb18e29200404c05eca5c3ab10ea8ff1427f85002e73642d	5697038
20260124110000	enforce not null approvals	2026-07-28 06:53:49.915739+00	t	\\xc9576f68c0337ab0949b505b0786846bb44ea67a2fb54e2bfa6ae8688c0d247f619c07b11b001ee4fea90555b703de8a	8034493
20260124120000	create contract templates	2026-07-28 06:53:49.927621+00	t	\\x43efc3ca2b3e0594dcfdd3f04100962a58a026721c73dbe45de4924fb5fa45d4828628f004613ab2ed4ecee2288fd5d1	8386250
20260124125900	cleanup approval workflows	2026-07-28 06:53:49.938897+00	t	\\xd6172b5f716789aa503a74b9ad1c003b89b1d2ab458d4d7e4be76632324e5978605e09ec02b004351ede839d99cf3045	10516381
20260124130000	create approval workflows	2026-07-28 06:53:49.952334+00	t	\\xd9328ca9ab4f06617e37e0fbd3727d866df0a9824137e96622a9084700508c8605a91dbb93d4858d1211ec5a07259217	12438761
20260124140000	add template id to contracts	2026-07-28 06:53:49.967872+00	t	\\xf072549949fd1c7b5d75cc682ab3bf51a25b1aaf3055909aa42c1b5f5a5139e409a9524de888e6e20043c789a9c69f48	9890014
20260124150000	create settings	2026-07-28 06:53:49.981944+00	t	\\x9152886e6670f85f512675ad7cc76da6b6817eb2cb22089fdc8a95b2106ccef2a986fc6302ecd77a4cf23d1864ca9ccc	10711936
20260124200000	performance indexes	2026-07-28 06:53:49.996686+00	t	\\xe09b1111400431f05f5c4099d3acba4e114cd215202774727a47e73cf36a0d55faf2db5abfef43fdb3af2437be41a051	15314296
20260125200600	ensure sale fields	2026-07-28 06:53:50.017755+00	t	\\x294b8c5586339ca5d16f1af700b808f72471ac21efee0ce557c1811c42748082bc67d6642ecf06ccefded8aa3066c1b4	9315791
20260125222000	performance tuning	2026-07-28 06:53:50.030913+00	t	\\x080c888fc322d7b3f2b32ab6fd47917cdc6edef1115c02d7bec5de891fcdfd72abdaebe345d81a481a3cafc697ac128d	12291032
20260126023208	add asset version column	2026-07-28 06:53:50.047711+00	t	\\xcf9de9fd9e70333180f965d2663f1367640c70861841af35257d29aa47787525a25a0bd2d881c2031ed1c500851538aa	7078183
20260126110000	create asset expenses	2026-07-28 06:53:50.060038+00	t	\\x9991ebb450b9210355d83ae6ff2bd28593ef7e490b22996797da6f520d46b27fe80833d5d95c6f8fe4d36eac0bab458e	19973383
20260126130000	create asset expense items	2026-07-28 06:53:50.084526+00	t	\\xd7647aff802fc082b9f99e713a35b2818f1027edb6559f4790d0d6d77f44491ff6ad4975f9d4a49ccfa2ca6b446ad405	16099717
20260126140000	add expense type	2026-07-28 06:53:50.107167+00	t	\\x85e6f0f043fecafcb8575524670bd30bb1fa171534a06f5d2cde8ee643b2073096c31905b5fe4532e93147e7d5de4e10	12560922
20260126144500	add wo expense fields	2026-07-28 06:53:50.126253+00	t	\\xeacf6a27353fb65029701535c5f3c728e8a9d3e1c8c51c12832faffc43efad826b3eb95cae54b5730d63ad0dda788ba6	8526923
20260126153000	add wo part expense type	2026-07-28 06:53:50.137753+00	t	\\xa63067356b878f66e4d8c3797bc59a0e0a4a159dde716ec942fb0f6b2429a9b9e953581a30bc315ed2525459274cface	5165072
20260126162500	add dual expense ids	2026-07-28 06:53:50.145133+00	t	\\x591cdaf08f127055f31a4a41db27660ad1db343fde2ad548193b2df646881db0676c035514b78262fc2991d8c1ee7701	5573104
20260126173000	create maintenance templates	2026-07-28 06:53:50.152677+00	t	\\x4767e24f48e381663ec1192b737b04066414d87a34c4486b726d5119a5d16f9d9baab9bf8645894d11e0002c122a9c93	13626487
20260127000000	create inventory module	2026-07-28 06:53:50.168263+00	t	\\x625321db901eb45d695d4870f2a254df8ef73c545b6489b63733a9a9908b8f64969a9cb6f0a21f8e0e25000aefdeb918	30777468
20260127000100	standardize indonesian coa	2026-07-28 06:53:50.201328+00	t	\\x83f0aef65dfb19c540bb5f4f782f82ee00549058715059361f4e0d224d420cb3767658cfc71857636f3abc74ed609bb8	151868172
20260127054522	alter work order parts	2026-07-28 06:53:50.356548+00	t	\\x769bceeb62051c7cec0098366191e959dd43802e7ada398c79516627e3ac7a0fcdc5bdab20c8108bb7a8cd699910740f	17521787
20260127060000	seed inventory items	2026-07-28 06:53:50.376598+00	t	\\xf4f6966f563b923554d4a8806c72328a6620c819fbf48109e98c100dab0b90cbff7757f96df11b785f75965013bfa530	29915088
20260127083000	add asset account to categories	2026-07-28 06:53:50.408607+00	t	\\x232812891726b3b85769712391e46ba9cc24cd28f898081c355c3156e21f11d5ef578ed4d0d7107ef5f16a9b297ff3c6	7664943
20260127084500	add depreciation accounts to categories	2026-07-28 06:53:50.418349+00	t	\\x5771d4c27a51d6543c119e94c3999ca310f7a644a15b980303c025d1d74656f0bb9d0ab12e9afd1ad9b3c11da1459ec9	8698386
20260127100000	create maintenance schedules	2026-07-28 06:53:50.42932+00	t	\\x611437859aadec7b04b1de0faf3c14abf647989097942cd27d71fc2b4c447fd8c447f4b7397ee7d47139dfcba7fe97ba	11801087
20260129000000	create asset tax renewals	2026-07-28 06:53:50.443053+00	t	\\x9765610b8bf773941b65baafb84932f43ee78c402764ee7a5bd6c0e99cdf589040b988d4b8a17ba7a21a3af91822ba7e	11200141
20260130023352	add payment destination to tax renewal	2026-07-28 06:53:50.456247+00	t	\\xde97fa51d6e141a2371c21f68144b18b340df816b671946822d65532b6e19862051cd55a37949d0625638eb23da50884	3664909
20260130050000	add attachment to tax renewal	2026-07-28 06:53:50.46179+00	t	\\x5ef2734dd2f72190f9348a1c3e6cd1599da9ba033a7f28ec6e3a76ea597c9f61a03853ba1374ecf3a846395c2225d3d7	3313836
20260130051000	add attachment to purchase bills	2026-07-28 06:53:50.467159+00	t	\\xf462cf13641959c2a9eebf6c99b3589335b37eb6c8da60a1369dc59ba1b8678696fcbfd450d2535efbcde1b0a8abe62e	5449930
20260130062000	add payment date to tax renewal	2026-07-28 06:53:50.474825+00	t	\\x39a7980971a0b8ca9a62aabc3a1f4aaa113cc7649a22118fd658530f281f2196001ea939674be95bc80c2840f294edc3	3603852
20260131153000	add fuel accounts	2026-07-28 06:53:50.480407+00	t	\\x297645f9ea754cfa1804aaff841f97f103002b8d6d77363418ec96a10435835b88c5bb72aba690142e85a92906abc812	5917171
20260131160000	add tax payable	2026-07-28 06:53:50.488379+00	t	\\x5aa384401c45dc8ceebc8f419ce7da6fc16dbf2b712ed99cf41715869e70cc88dd6d7aa0389da2d176320619b1b7f107	5538536
20260131210000	add labor applied	2026-07-28 06:53:50.496024+00	t	\\x39c534a7bca647dfac5cfaeae4ac93c7ba214baee523dc3a348c6f11d094ad08984a5bfe9d09143d8d4b4f87ed0689f7	4576293
20260131220000	create depreciation logs	2026-07-28 06:53:50.502584+00	t	\\x04eb75255d99a78faac0b28261613b009261b87ef282a55a6f538dc448ea49c367b00bb77b63b4f7704560cd0d93479c	9975518
20260131230000	optimize search performance	2026-07-28 06:53:50.515108+00	t	\\xd0ab9d0f30f2f9890014cc4550cca2e9a7141a426032615b217f1e9491bf8bb97f7cb55f84ab8eb40082f3f144252769	13719259
20260201000000	add expense type to finance	2026-07-28 06:53:50.531109+00	t	\\x4f87856dd730c082a53bec891cdbb084a96f021e7460c3530e86a27830400c92aeff66fbd9b48b4ee52b83a603dfb9a1	5771197
20260201100000	add budget type to purchase orders	2026-07-28 06:53:50.53956+00	t	\\x85bb9ef99ed43e5c74b2e07c6ccf0e84af07c92773ac069579c5fdfe56b34f73e6a4323aab5b357015b15b6ecb05a754	4842326
20260203144000	add budget type to purchase bills	2026-07-28 06:53:50.546452+00	t	\\x929d00881654fe75e18d92cc68550974e4e610c9418b7e8c6aa8291393bdf9946c725bd69a0380cd5fec5a7b3781380d	6073204
20260311161200	add supervisor signoff	2026-07-28 06:53:50.554872+00	t	\\x231dc51bbda25a87b46970c021ac48bdb79439fcae1eff65879ee2e9440046f01bd725a782b4fac7ca34b674335ef3d6	3720395
20260513083300	create inventory documents	2026-07-28 06:53:50.560644+00	t	\\xdf191e52d2e4c701cf08680823a39d83bf17d06e7271f1052898740d925a5680ad24db1a18d3a1c9a0cc40336e7f7295	11856189
20260513220500	add tax renewal setting	2026-07-28 06:53:50.574726+00	t	\\x07ef1bbb268657df229a45ad00cda6c300c339389f95f8823ff424c432bee41111eeab17206e8f6f79f07d51c4acaa8f	4624100
20260513220800	update granular warning	2026-07-28 06:53:50.581343+00	t	\\xe1bfbe6ec483630e0855d8496fb792a5f30f5284cb1fd0d23f1a919b8167a2a32b795e1344fb8953d9961e77ed74430d	4439102
20260520000000	align with assets txt	2026-07-28 06:53:50.587721+00	t	\\x25c1725db2e4660c27ca13c36d5d367b187450dd4f5aaa7cc9bedb1e1cdc1ab969bd0a20c033c3dd479cc873d82bb850	34374610
20260521151600	add asset group to categories	2026-07-28 06:53:50.62434+00	t	\\xbd33a6003320838fe8d081ce5f865c5363d5cd0fc8c1c72ac5566c6fb127b7e63b0820bf1c4c28aecca9ed4054b2bbf2	7236464
20260521155000	add indonesian admin roles	2026-07-28 06:53:50.633895+00	t	\\x1ce2d84b0a0a6450ee0b2d1fd546eaedc02e8676816b5a5821ead20f378ac74e31b357219a78cd2a7f2356f550292582	14341403
20260525164547	add allowed asset group to users	2026-07-28 06:53:50.650385+00	t	\\xac53bc82a73d1fcd8f4c473d0ae8a4669cc3c52aeae29be374b26cf6b90e344a6857581b19f59b6c4a8ee819095159d9	4802818
20260804000001	add is account requested to employees	2026-08-05 05:00:24.162189+00	t	\\xafe487cb8f8454fb377028b1c01d87b284b4b5be9040969c83b3d1b8b18a4e78d9a4144f2d12c26253615641994e95ac	19570928
20260805000001	add approval levels 3 5	2026-08-07 03:51:15.597928+00	t	\\x2bede36f3bc2468b561fddca86c58cd129dce15ee4243f41ee68a198e6b693ec3d4a48dc3296b563431068b315978d9d	579108050
20260727130000	create approval entity types	2026-07-30 06:17:47.567184+00	t	\\x67479713bf77eb178075b83aefe4808720a9759c98e2003b07cfd8434df94df985597c1da70bb84aed5d64fd259c54de	50390088
20260724200000	seed launchpad config	2026-07-30 06:17:47.545421+00	t	\\x1a666dc552b33537a08053d79033bd73a3ff6426b82e576de5f392415bf587d1a8b7dd437d2c8ab84e774a719ad1b6ef	17779980
20260731235900	update sop templates	2026-08-01 02:24:23.148739+00	t	\\xb9ded2fb14a9d6dced00ea0d2236b00c273318641df8f38516d944e5789a7365e5f9ac4857e5a182c9e358365cb79545	63925294
20260801000001	seed all menu permissions	2026-08-01 03:13:57.242104+00	t	\\x4dfc65fc3b3a1f79f1b483e142b62f54738ada1e9cfbe2cc8bcec70d5994d3708df527bab850a27d87c75bbe06a1bcd0	52490764
20260801000002	cleanup duplicate specialist roles	2026-08-04 05:29:39.981602+00	t	\\x0ee71ef2ae7502928b7a474e6d24c13abd175889a97c52709857b1749cf0e7fb3e84ef3660fa84e3700fd06d55e44fc5	33071937
20260805000002	seed contract entity type	2026-08-07 03:51:16.180361+00	t	\\x704ee53c498fd5580bb905f8f7a5ba64c617efb8af48e94cbf2db3692394e8b808bce4dbadb8b40aeff9b1bc9e664816	8613547
20260805000003	create approval histories	2026-08-07 03:51:16.193089+00	t	\\xa2266573392b873c4366d7640c2a7a0ebef468888638e2717324e32b200837ea8d0e103e867708e07a9f29c35d512a5e	18090746
20260805000004	add module callback to approval requests	2026-08-07 03:51:16.214334+00	t	\\xa88eb6c6413501d92740c616bd174702f72676e3919496ee10914c235b77513c7b68b95dd31a655aa791367f2e3e22ee	6841003
20260805000005	backfill approval requests	2026-08-07 03:51:16.223965+00	t	\\x912f0c022c4e0898e57068c36e90372f49e0c695f6feb729ac6fa1b12f1d28723d2954fb4fefd861d49c9e3929afd280	25607783
20260806000001	create companies table	2026-08-07 03:51:16.252355+00	t	\\x5de643f9680517d9e8b2d03deee12cf61a45ac9dba848d91bef8f5c6420fdbc9643e122590141074216b61b276e9c83e	13269432
20260806000002	create cost centers table	2026-08-07 03:51:16.272277+00	t	\\x8c166cc0f9f238afde1648bc8fb3a2bc94dea7393f1c36190068e8f4ecb1ae38325b6cbd6a8bb45b988c8a321ff1cf26	12650876
20260806000003	add company id to business tables	2026-08-07 03:51:16.287509+00	t	\\xe8b384359087772c94f4fffd17e88ae8ab3d501820452721399640be894862e5e603e56c2c1f9157e33c12ebdc010fed	58399545
20260806000004	qkrn006 idempotency log	2026-08-07 03:51:16.349857+00	t	\\xd84bdda4508107bd86380b9f5398009d39536cc2385abff522f2783235e92a69602c1b89cb22e3e4e03434e9429e09cd	10941515
20260806000005	qkrn009 document audit trail	2026-08-07 03:51:16.364244+00	t	\\x9217147d067e5e46bbba97897175091bbe6f194ea403d0f159f5be3a50acefdf878ead92538242fcabf5066e7bb8e8c7	9731068
20260806000006	qkrn010 naming series	2026-08-07 03:51:16.376943+00	t	\\x2c7128b077deff02afc8c9633b8f61e0584446e74c14914e913316b5d5bf482d521bff30f45df578e82abbf58d283f13	7603761
20260806000007	qkrn011 outbox	2026-08-07 03:51:16.387742+00	t	\\x2d7ceedbee4a51946a98891007ab412c39ac24717dc066e9ce186ab36e795016e5eea38b45c022de1d469fe1975ef68d	12665151
20260806000008	qkrn012 db invariants	2026-08-07 03:51:16.403156+00	t	\\x3d09c4120bf4e0f455d3a242453f53d0db3cfd00000dc501cf9881e136dc782203c131f2d1ee43dc17650d824f33d0d8	9739244
20260806000009	qarc009 append only audit	2026-08-07 03:51:16.416632+00	t	\\xd1ad146a11e1e3461bce3f025d85f0e63f8ce0809c21a0d6ae78a7216cda3a9dc06cb61a48d572ad61262c0d6322077e	6097896
20260806000010	idempotency request fingerprint	2026-08-07 03:51:16.4255+00	t	\\x3dcd985be207f8626de20f57b13283e2f2642436ea4866381217099c87e1ce58f89145a72854c3da8d16c4a42f580796	4907213
20260806000011	create gl entries and fiscal periods	2026-08-07 03:51:16.432909+00	t	\\x9a7bd5623e349ae15369c28b6735d5602fdb53611692725b13dd373fa257254e31a447aed761155a661b16690bdbac8c	40760738
20260806000012	create stock kernel tables	2026-08-07 03:51:16.476407+00	t	\\x863035335417e47214fe547fffb6af0430614eb1f82973d10e78ea46c94f78de918410bc929c7371681fa0e77783429a	33296723
20260806000013	create commercial document graph	2026-08-07 03:51:16.512357+00	t	\\x35b41d957f2fbc6187c59964ebe88bf99d40abcf2f513f9ca9b2526aefb3d07eed4b1d08713d8f0edb63193ee8fd1085	23490170
20260806000014	create asset eam remediation	2026-08-07 03:51:16.538408+00	t	\\x12b03a6a529050647b07c7e2482ccca3b9c611c80c7046f8fea98f985af71b00407e059b2fd93ca5ba1054b8260039e4	17069843
20260806000015	create platform services	2026-08-07 03:51:16.558556+00	t	\\x3684ce8ae8c38f6ca800d3ccb80513ce9e15f8f08c2466d3a6979acf17d9bc51e47d94f15e717b2d37d378693e6c8b29	9220345
20260806000016	create metadata kernel	2026-08-07 03:51:16.570311+00	t	\\x01e7391c928105cf4dfe224cf0e07f986e67afe0d473c311cca46b12b17ed668d7a0a6c2a8ba43fd1ccd9693ae52baa4	20548930
20260806000017	create reporting print api platform	2026-08-07 03:51:16.594427+00	t	\\xdc713661e56e70c71388c589d6819f92ffec0a023833a5bdf0bcf4e8ba72f8047d72a03de5d48fc1ccf3abc708160e2e	15600837
20260806000018	create app system	2026-08-07 03:51:16.613379+00	t	\\x9502010e2f8c2e1ef132cb1dc535b6067eafc5bb9ec9d246736b61750f994aa251d41170b84699a8dc3854c0ac523a13	10560401
20260806000019	create operational erp tables	2026-08-07 03:51:16.626869+00	t	\\xcc6d825366834243851d79eeba2bcf83113d9a4c0086371927568b8872b86e45f72dfb97681b6c886a3512aa79436e22	25937082
20260806000020	create manufacturing quality pos tables	2026-08-07 03:51:16.655427+00	t	\\x42c0a88ea4c69df0d0c06a0ec0be574133f9121244790d758a08d5ef0cd485fe9e94edfeacdc264973058696760e2b21	27637944
20260806000021	create indonesia localization tables	2026-08-07 03:51:16.685716+00	t	\\x959e077e2a41e986712be54dddfaa7c84fe677035ba633246288f0dbcb1d9b77e745d6269e361f88145a9050fd20cd1c	13597045
20260806000022	create production engineering tables	2026-08-07 03:51:16.705406+00	t	\\xab6357203d5dcfa26d153c1dc627a918e4d974a2b1fe5c04a626623bd2b24178dbfcd8dd9ce933ee2080be4c88a9c52e	11198057
20260806000023	create data migration framework	2026-08-07 03:51:16.719269+00	t	\\x688749622899b1db4c144a40b622c836e67b762494dd12bb0f8ff439c130bb429a10f7cf98b9ed82fe7efc85a9bea406	14691535
20260807000001	create frappe style rbac	2026-08-07 06:25:16.976417+00	t	\\x03c566af3705ff8a23b895c0c7dc220b1da46c7e974bb3d39ed146bdff997102a921a2a517329893700d62b012075fcc	14634124
20260807000002	create frappe style workflows	2026-08-07 07:01:19.623466+00	t	\\x23e33e68a725877e0645964fba80b57e67f9d39f08f8e2545a4ea48dd8421956a737a17a1bb143b6492a3e6937ad3e5a	29596425
20260807000003	create data import engine	2026-08-07 09:43:24.038529+00	t	\\x863ff30c75c7414528879baa7292e1381c86f9fc59c2503d3ea92e304991e747fe66d657e7409306ead45a6dbcef7430	12982139
\.


--
-- Data for Name: accounting_periods; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.accounting_periods (id, fiscal_year_id, period_name, period_number, start_date, end_date, is_closed, closed_at, closed_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: api_credentials; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.api_credentials (id, tenant_id, company_id, client_name, api_key_hash, scopes, expires_at, is_revoked, created_at) FROM stdin;
\.


--
-- Data for Name: app_migration_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.app_migration_history (id, app_name, migration_name, executed_at) FROM stdin;
\.


--
-- Data for Name: approval_entity_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.approval_entity_types (id, value, label, icon, color, description, backend_module, is_active, is_system, created_at, updated_at) FROM stdin;
d3c56299-2fdc-42cf-b33f-e9fd1429bcf1	asset	Asset	Box	text-green-400	Asset creation, sale, and disposal	asset_service	t	t	2026-07-28 08:51:06.707082+00	2026-07-28 08:51:06.707082+00
59b6262d-e4b0-4eb2-bf77-31f1c4744cd5	work_order	Work Order	Wrench	text-blue-400	Maintenance work order creation	work_order_service	t	t	2026-07-28 08:51:06.707082+00	2026-07-28 08:51:06.707082+00
eea4cfe6-2024-47f5-9bfa-179360bb36b4	loan	Loan	ArrowLeftRight	text-cyan-400	Asset loan requests	loan_service	t	t	2026-07-28 08:51:06.707082+00	2026-07-28 08:51:06.707082+00
35f436c7-9c52-498f-a772-01e7b83a971a	lifecycle_transition	Lifecycle Transition	RefreshCw	text-violet-400	Asset state changes (deploy, retire, etc)	asset_service	t	t	2026-07-28 08:51:06.707082+00	2026-07-28 08:51:06.707082+00
1ec1bdf2-f280-4878-b750-619b983c0bbc	rental_request	Rental Request	Truck	text-orange-400	New rental order requests	rental_service	t	t	2026-07-28 08:51:06.707082+00	2026-07-28 08:51:06.707082+00
9130af1e-eb5e-436a-840d-57eeec4fcf2d	timesheet_verification	Timesheet	ClipboardCheck	text-teal-400	Timesheet verification requests	timesheet_service	t	t	2026-07-28 08:51:06.707082+00	2026-07-28 08:51:06.707082+00
8ef1d3c6-a0bf-4f3a-96f5-618955e374b6	conversion_request	Conversion	ArrowLeftRight	text-purple-400	Unit conversion requests	inventory_service	t	t	2026-07-28 08:51:06.707082+00	2026-07-28 08:51:06.707082+00
7ca9958f-d663-40aa-ae9e-db3263e772b0	fuel_request	Fuel Request	Fuel	text-yellow-400	Fuel logging requests	fuel_service	t	t	2026-07-28 08:51:06.707082+00	2026-07-28 08:51:06.707082+00
c69d2f0b-e2bc-4a64-87fd-e49ccf410215	tax_renewal	Tax Renewal	FileText	text-rose-400	Tax/KIR/STNK renewal requests	tax_renewal_service	t	t	2026-07-28 08:51:06.707082+00	2026-07-28 08:51:06.707082+00
9c1b90b6-0678-4d6e-87ef-138a94ddda36	contract	Contract	FileText	text-cyan-400	Contract creation, renewal, and amendments	contract_service	t	t	2026-08-07 03:51:16.180361+00	2026-08-07 03:51:16.180361+00
c30a0cef-2700-4d15-b291-cea4c31cd5bc	purchase_order	Purchase Order	ShoppingCart	text-indigo-400	Purchase order approval requests	purchase_service	t	t	2026-08-07 03:51:16.180361+00	2026-08-07 03:51:16.180361+00
0f4c5b36-1c33-451e-81ef-44a61585791e	expense_report	Expense Report	Receipt	text-rose-400	Expense reimbursement approval requests	finance_service	t	t	2026-08-07 03:51:16.180361+00	2026-08-07 03:51:16.180361+00
61e5f4fd-3022-43d4-875f-8229ae6bc7cf	vendor_registration	Vendor Registration	UserCheck	text-teal-400	New vendor registration approval	vendor_service	t	t	2026-08-07 03:51:16.180361+00	2026-08-07 03:51:16.180361+00
9589fb08-f7e5-47d8-b428-261c5331fa98	leave_request	Leave Request	Calendar	text-amber-400	Employee leave approval requests	employee_service	t	t	2026-08-07 03:51:16.180361+00	2026-08-07 03:51:16.180361+00
3f6f44ec-6653-43d5-a453-3cc7a0af296c	overtime_request	Overtime Request	Clock	text-yellow-400	Employee overtime approval requests	employee_service	t	t	2026-08-07 03:51:16.180361+00	2026-08-07 03:51:16.180361+00
\.


--
-- Data for Name: approval_histories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.approval_histories (id, approval_request_id, action, actor_id, level, previous_status, new_status, notes, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: approval_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.approval_requests (id, resource_type, resource_id, action_type, requested_by, data_snapshot, status, current_approval_level, approved_by_l1, approved_at_l1, notes_l1, approved_by_l2, approved_at_l2, notes_l2, created_at, updated_at, workflow_id, required_levels, approved_by_l3, approved_at_l3, notes_l3, approved_by_l4, approved_at_l4, notes_l4, approved_by_l5, approved_at_l5, notes_l5, delegated_to, delegated_at, escalated_at, escalated_to_role, module_callback, callback_data, final_approved_at, final_approved_by) FROM stdin;
\.


--
-- Data for Name: approval_workflows; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.approval_workflows (id, workflow_name, entity_type, approval_levels, level_1_role, level_2_role, level_3_role, level_4_role, level_5_role, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: asset_conditions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.asset_conditions (id, code, name, description, color) FROM stdin;
1	NEW	Baru	\N	green
2	GOOD	Baik	\N	blue
3	FAIR	Cukup	\N	yellow
4	POOR	Buruk	\N	orange
5	BROKEN	Rusak	\N	red
\.


--
-- Data for Name: asset_conversions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.asset_conversions (id, request_number, asset_id, title, status, from_category_id, to_category_id, target_specifications, conversion_cost, cost_treatment, reason, notes, requested_by, approved_by, executed_by, request_date, approval_date, execution_date, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: asset_custody_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.asset_custody_history (id, asset_id, custodian_user_id, department_id, location_id, assigned_at, assigned_by, notes) FROM stdin;
\.


--
-- Data for Name: asset_depreciation_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.asset_depreciation_logs (id, asset_id, journal_entry_id, amount, depreciation_date, period_month, period_year, created_at) FROM stdin;
\.


--
-- Data for Name: asset_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.asset_documents (id, asset_id, name, type, file_path, mime_type, size_bytes, expiry_date, notes, uploaded_by, created_at, updated_at) FROM stdin;
669d9ecd-be47-4cb2-8bfa-93f1a8f1bee1	f90d66ac-6150-449c-9550-f8fe5c0fef3e	Visual FRONT	FRONT	/api/uploads/2026/07/28/c06eabbe-d16e-418f-8656-bd45b74e0ca3.webp	image/jpeg	73956	\N	Uploaded via 4-sided visual menu	00000000-0000-0000-0000-000000000001	2026-07-28 07:07:28.713522+00	2026-07-28 07:07:28.713522+00
7ba76af5-6cc9-4c7a-8ce2-7ff2c4e8e8ec	79e7d587-265f-46d7-ae06-8070f9a537b2	Visual FRONT	FRONT	/api/uploads/2026/07/28/6596c23b-4757-44fd-a6a5-5b421b136a38.webp	image/jpeg	120748	\N	Uploaded via 4-sided visual menu	00000000-0000-0000-0000-000000000001	2026-07-28 07:16:34.436137+00	2026-07-28 07:16:34.436137+00
64197c47-3569-4d49-b3e0-1966e919fe8c	ad65e6f6-9b65-42f6-a5bb-a8f442379778	Visual FRONT	FRONT	/api/uploads/2026/07/28/679d8099-9a8c-4ae5-b970-c5a792721cbd.webp	image/jpeg	121938	\N	Uploaded via 4-sided visual menu	00000000-0000-0000-0000-000000000001	2026-07-28 07:19:27.411777+00	2026-07-28 07:19:27.411777+00
b8d2596f-8ece-4b87-94df-c7676c5ac054	96f1ca37-7132-437e-ac3c-ef0d0bd7aab3	Visual FRONT	FRONT	/api/uploads/2026/07/28/fe289957-d210-4a64-81de-8d8285034541.webp	image/jpeg	166024	\N	Uploaded via 4-sided visual menu	00000000-0000-0000-0000-000000000001	2026-07-28 07:20:32.710038+00	2026-07-28 07:20:32.710038+00
8b5793ae-1a91-4c5b-9987-ca826cec79ac	36772359-e9c7-4d3a-b276-540e24cb3e60	Visual FRONT	FRONT	/api/uploads/2026/07/28/3d42f154-cd14-419c-9211-e68ac7492f6a.webp	image/jpeg	289820	\N	Uploaded via 4-sided visual menu	00000000-0000-0000-0000-000000000001	2026-07-28 07:23:00.371114+00	2026-07-28 07:23:00.371114+00
4e20e8a8-61c6-4046-a7c3-c30ea781254c	66666666-6666-6666-6666-666666666604	Visual FRONT	FRONT	/api/uploads/2026/07/28/242d646f-b3e4-4183-8a71-1065801f141c.webp	image/jpeg	40662	\N	Uploaded via 4-sided visual menu	00000000-0000-0000-0000-000000000001	2026-07-28 09:00:59.92611+00	2026-07-28 09:00:59.92611+00
89991a4c-ca6d-4a61-873b-d5639b0ebd53	66666666-6666-6666-6666-666666666620	Visual FRONT	FRONT	/api/uploads/2026/07/28/3a7f1039-234c-417d-9d1f-1df21a3dbebf.webp	image/jpeg	58224	\N	Uploaded via 4-sided visual menu	00000000-0000-0000-0000-000000000001	2026-07-28 09:02:29.578338+00	2026-07-28 09:02:29.578338+00
2af3ed67-0839-4760-a8da-fc2ada662777	66666666-6666-6666-6666-666666666603	Visual FRONT	FRONT	/api/uploads/2026/07/28/dc4a1ad7-69a6-472d-8f44-19327f0b04ca.webp	image/jpeg	103892	\N	Uploaded via 4-sided visual menu	00000000-0000-0000-0000-000000000001	2026-07-28 09:03:53.666157+00	2026-07-28 09:03:53.666157+00
6d77c165-b119-440c-a0ac-041e4ce6441d	3b6ecb6e-e9dd-49b4-b99e-f158a69c32e8	Visual FRONT	FRONT	/api/uploads/2026/07/28/be3ba1bf-7290-4d9b-9824-e6c55918deef.webp	image/jpeg	281936	\N	Uploaded via 4-sided visual menu	00000000-0000-0000-0000-000000000001	2026-07-28 09:04:44.459367+00	2026-07-28 09:04:44.459367+00
07aa46f2-627d-4786-810f-53724838d8d2	3b241ee4-d374-4217-b303-946da3bf0d00	Visual FRONT	FRONT	/api/uploads/2026/07/28/1e151d15-d9a0-4c4f-afe3-d46b8e8f745b.webp	image/jpeg	246512	\N	Uploaded via 4-sided visual menu	00000000-0000-0000-0000-000000000001	2026-07-28 09:05:45.314936+00	2026-07-28 09:05:45.314936+00
c41cb0f1-2265-4f09-b238-73ae0ab685b9	66666666-6666-6666-6666-666666666605	Visual FRONT	FRONT	/api/uploads/2026/07/28/a18d9cf9-d49e-4824-9959-ee9b777ad8e3.webp	image/jpeg	95144	\N	Uploaded via 4-sided visual menu	00000000-0000-0000-0000-000000000001	2026-07-28 09:07:05.632397+00	2026-07-28 09:07:05.632397+00
77de76ce-6ce4-461e-831b-7e67bd441c4c	2a13467e-2e81-4b46-a934-cd1564916ab0	Visual FRONT	FRONT	/api/uploads/2026/07/28/67caf4de-c07f-48ae-8f82-c1dfd748b5e7.webp	image/jpeg	166024	\N	Uploaded via 4-sided visual menu	00000000-0000-0000-0000-000000000001	2026-07-28 09:07:33.18381+00	2026-07-28 09:07:33.18381+00
cd14ac1a-deb2-4493-89e5-60765b15871a	97832e0a-15cd-4e72-bb77-548028065fe5	Visual FRONT	FRONT	/api/uploads/2026/07/28/a2261164-e6c3-450f-adfe-3592901e425c.webp	image/jpeg	166024	\N	Uploaded via 4-sided visual menu	00000000-0000-0000-0000-000000000001	2026-07-28 09:07:53.495718+00	2026-07-28 09:07:53.495718+00
4f787672-847e-484f-b546-5e5456e9fe90	ac342b8f-571d-44c6-bcd1-32018899c2c1	Visual FRONT	FRONT	/api/uploads/2026/07/28/1a5fc450-d587-42cf-abed-34fd6c072a40.webp	image/jpeg	163764	\N	Uploaded via 4-sided visual menu	00000000-0000-0000-0000-000000000001	2026-07-28 09:08:43.210733+00	2026-07-28 09:08:43.210733+00
e0b0d88d-40f3-4e91-94dc-32e3dbc2abc8	07626bdf-a194-43b9-9f80-2b2bd33c862e	Visual FRONT	FRONT	/api/uploads/2026/07/28/787ebe1a-9766-45cc-8f78-02611c2c5fa8.webp	image/jpeg	149516	\N	Uploaded via 4-sided visual menu	00000000-0000-0000-0000-000000000001	2026-07-28 09:10:04.916117+00	2026-07-28 09:10:04.916117+00
fc3ab47d-45c8-4d9f-962d-6d700275315d	66666666-6666-6666-6666-666666666612	Visual FRONT	FRONT	/api/uploads/2026/07/28/e8664819-8eb4-4424-9e63-19ed94865b55.webp	image/jpeg	125016	\N	Uploaded via 4-sided visual menu	00000000-0000-0000-0000-000000000001	2026-07-28 09:11:54.058821+00	2026-07-28 09:11:54.058821+00
23e524db-fa52-428b-986e-092c83454e1d	66666666-6666-6666-6666-666666666630	Visual FRONT	FRONT	/api/uploads/2026/07/28/faf76a54-44d3-4734-bb80-d5f16b3f86c9.webp	image/jpeg	165222	\N	Uploaded via 4-sided visual menu	00000000-0000-0000-0000-000000000001	2026-07-28 09:15:32.562048+00	2026-07-28 09:15:32.562048+00
31776a21-3722-464e-a8f8-e42913272fe2	66666666-6666-6666-6666-666666666621	Visual FRONT	FRONT	/api/uploads/2026/07/28/313d07c6-67ca-4a07-8a83-9c95a5f62991.webp	image/jpeg	126722	\N	Uploaded via 4-sided visual menu	00000000-0000-0000-0000-000000000001	2026-07-28 09:16:39.962466+00	2026-07-28 09:16:39.962466+00
990100be-dc6e-4fbd-bb8b-42bff7fa2912	66666666-6666-6666-6666-666666666602	Visual FRONT	FRONT	/api/uploads/2026/07/28/96758a72-b466-4cd7-9740-58a620cf13fe.webp	image/jpeg	84008	\N	Uploaded via 4-sided visual menu	00000000-0000-0000-0000-000000000001	2026-07-28 09:18:06.369955+00	2026-07-28 09:18:06.369955+00
51fe01e4-4ea1-48fa-af14-f6ddd71e4748	8120a96c-bbbd-4a13-9bd7-ed9388118ff6	Visual FRONT	FRONT	/api/uploads/2026/07/28/014efdad-8221-4cf9-ad93-ed8803f69d49.webp	image/jpeg	260734	\N	Uploaded via 4-sided visual menu	00000000-0000-0000-0000-000000000001	2026-07-28 09:19:07.169939+00	2026-07-28 09:19:07.169939+00
cbb1c51c-aa4f-40b0-be05-a67df4a52547	867be6ac-a95c-43c7-b4aa-42fd7e395e29	Visual FRONT	FRONT	/api/uploads/2026/07/28/f2082d2d-7cd9-47e5-abc4-1293f9aad40f.webp	image/jpeg	131872	\N	Uploaded via 4-sided visual menu	00000000-0000-0000-0000-000000000001	2026-07-28 09:20:21.100185+00	2026-07-28 09:20:21.100185+00
04271477-f867-4af4-8f21-df7a29963478	66666666-6666-6666-6666-666666666601	Visual FRONT	FRONT	/api/uploads/2026/07/28/559b65f3-a7f2-4ab6-8c6a-7b27d6ea7675.webp	image/jpeg	239518	\N	Uploaded via 4-sided visual menu	00000000-0000-0000-0000-000000000001	2026-07-28 09:24:39.971413+00	2026-07-28 09:24:39.971413+00
b0366ca9-d8fa-420c-8c11-29693d95eebc	66666666-6666-6666-6666-666666666611	Visual FRONT	FRONT	/api/uploads/2026/07/28/2fcee221-bcdf-42a9-9ce8-7c5a775c7498.webp	image/jpeg	188090	\N	Uploaded via 4-sided visual menu	00000000-0000-0000-0000-000000000001	2026-07-28 09:30:13.894286+00	2026-07-28 09:30:13.894286+00
c5cfa167-3b3d-4233-b957-4545c1a88f16	bbbcd1cf-d71f-4510-8296-daa2c9542aeb	Visual FRONT	FRONT	/api/uploads/2026/07/28/0d9ca691-0580-4e54-944d-e1601f3d045b.webp	image/jpeg	295792	\N	Uploaded via 4-sided visual menu	00000000-0000-0000-0000-000000000001	2026-07-28 09:31:45.409961+00	2026-07-28 09:31:45.409961+00
6c8df0bb-6843-4fca-90b1-40eee2fd2770	26e7d22c-9594-432b-b858-545b6a48982f	Visual FRONT	FRONT	/api/uploads/2026/07/28/0d00c715-6ecf-4334-bddc-e64ea04e6676.webp	image/jpeg	373062	\N	Uploaded via 4-sided visual menu	00000000-0000-0000-0000-000000000001	2026-07-28 09:32:52.198576+00	2026-07-28 09:32:52.198576+00
\.


--
-- Data for Name: asset_expense_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.asset_expense_items (id, expense_id, description, amount, created_at) FROM stdin;
\.


--
-- Data for Name: asset_expenses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.asset_expenses (id, asset_id, description, amount, date, vendor_name, invoice_number, proof_url, status, requested_by, created_at, updated_at, expense_type) FROM stdin;
\.


--
-- Data for Name: asset_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.asset_history (id, asset_id, action, from_location_id, to_location_id, from_user_id, to_user_id, notes, performed_by, created_at) FROM stdin;
\.


--
-- Data for Name: asset_lifecycle_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.asset_lifecycle_history (id, asset_id, from_state, to_state, reason, performed_by, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: asset_loans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.asset_loans (id, loan_number, asset_id, borrower_id, approver_id, loan_date, expected_return_date, actual_return_date, status, condition_before, condition_after, damage_description, damage_photos, terms_accepted, agreement_document, deposit_amount, deposit_returned, penalty_amount, penalty_paid, checked_out_by, checked_in_by, created_at, updated_at, employee_id, check_out_photos, return_photos) FROM stdin;
1f2664df-64e9-4e83-be23-d345ee89800e	LOAN-DEMO-001	8120a96c-bbbd-4a13-9bd7-ed9388118ff6	00000000-0000-0000-0000-000000000004	\N	2026-07-28	2026-08-04	\N	in_use	\N	\N	\N	\N	t	\N	\N	f	\N	f	\N	\N	2026-07-28 06:53:49.823749+00	2026-07-28 06:53:49.823749+00	\N	\N	\N
\.


--
-- Data for Name: asset_specification_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.asset_specification_history (id, asset_id, conversion_id, change_type, old_category_id, new_category_id, old_subtype, new_subtype, old_specifications, new_specifications, changed_by, notes, created_at) FROM stdin;
\.


--
-- Data for Name: asset_tax_renewals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.asset_tax_renewals (id, asset_id, document_type, current_expiry, renewal_cost, status, invoice_id, notes, created_at, updated_at, payment_destination, invoice_attachment, payment_date) FROM stdin;
\.


--
-- Data for Name: asset_valuations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.asset_valuations (id, asset_id, valuation_date, original_cost, accumulated_depreciation, book_value, market_value, replacement_cost, valuation_type, appraiser, notes, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: assets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.assets (id, asset_code, name, category_id, location_id, department_id, assigned_to, vendor_id, is_rental, asset_class, status, condition_id, serial_number, brand, model, year_manufacture, specifications, purchase_date, purchase_price, currency_id, unit_id, quantity, residual_value, useful_life_months, qr_code_url, notes, created_at, updated_at, organization_id, department, is_fuel, sale_price, sale_date, sold_to, photos, is_rentable, vehicle_details, is_loan, version, description, acquisition_method, funding_source, company_id, disposal_voucher_id, disposal_amount, custom_data) FROM stdin;
79e7d587-265f-46d7-ae06-8070f9a537b2	EQP-2024-003	Bulldozer CAT D6R	44444444-4444-4444-4444-444444444431	33333333-3333-3333-3333-333333333301	22222222-2222-2222-2222-222222222204	\N	\N	t	\N	available	\N	\N	Caterpillar	D6R XL	\N	\N	2022-06-10	2200000000.00	1	1	1	\N	120	\N	\N	2026-07-28 06:53:49.793435+00	2026-07-28 06:53:49.793435+00	11111111-1111-1111-1111-111111111111	\N	f	\N	\N	\N	{}	f	\N	f	1	\N	\N	\N	\N	\N	\N	{}
f90d66ac-6150-449c-9550-f8fe5c0fef3e	OPS-005	Daihatsu Gran Max (Logistik)	44444444-4444-4444-4444-444444444442	33333333-3333-3333-3333-333333333301	22222222-2222-2222-2222-222222222204	\N	\N	f	\N	in_inventory	\N	\N	Daihatsu	Gran Max BV	\N	\N	2023-10-05	180000000.00	1	1	1	\N	60	\N	\N	2026-07-28 06:53:49.793435+00	2026-07-28 07:07:30.98052+00	11111111-1111-1111-1111-111111111111	\N	f	\N	\N	\N	{}	f	{"vin": "", "brand": null, "color": "", "model": null, "asset_id": "f90d66ac-6150-449c-9550-f8fe5c0fef3e", "capacity": "", "fuel_type": "", "created_at": "2026-07-28T06:53:49.793435Z", "kir_expiry": null, "tax_expiry": null, "updated_at": "2026-07-28T07:07:30.969022307Z", "bpkb_number": "", "stnk_expiry": null, "transmission": "", "engine_number": "", "license_plate": "", "odometer_last": null, "lapor_tiba_expiry": null, "heavy_equipment_tax_expiry": null}	f	2	\N	\N	\N	\N	\N	\N	{}
ad65e6f6-9b65-42f6-a5bb-a8f442379778	EQP-2024-004	Wheel Loader WA380	44444444-4444-4444-4444-444444444431	33333333-3333-3333-3333-333333333301	22222222-2222-2222-2222-222222222204	\N	\N	t	\N	under_maintenance	\N	\N	Komatsu	WA380-6	\N	\N	2023-08-01	1800000000.00	1	1	1	\N	120	\N	\N	2026-07-28 06:53:49.793435+00	2026-07-28 07:19:33.613907+00	11111111-1111-1111-1111-111111111111	\N	f	\N	\N	\N	{}	f	\N	f	2	\N	\N	\N	\N	\N	\N	{}
36772359-e9c7-4d3a-b276-540e24cb3e60	DT-004	Fuso Fighter X (DT-04)	44444444-4444-4444-4444-444444444441	33333333-3333-3333-3333-333333333301	22222222-2222-2222-2222-222222222204	\N	\N	t	\N	under_maintenance	\N	\N	Mitsubishi	FN 62 F HD	\N	\N	2023-07-20	880000000.00	1	1	1	\N	96	\N	\N	2026-07-28 06:53:49.793435+00	2026-07-28 07:23:04.466876+00	11111111-1111-1111-1111-111111111111	\N	f	\N	\N	\N	{}	f	{"vin": "", "brand": null, "color": "", "model": null, "asset_id": "36772359-e9c7-4d3a-b276-540e24cb3e60", "capacity": "", "fuel_type": "", "created_at": "2026-07-28T06:53:49.793435Z", "kir_expiry": null, "tax_expiry": null, "updated_at": "2026-07-28T07:23:04.455045490Z", "bpkb_number": "", "stnk_expiry": null, "transmission": "", "engine_number": "", "license_plate": "", "odometer_last": null, "lapor_tiba_expiry": null, "heavy_equipment_tax_expiry": null}	f	2	\N	\N	\N	\N	\N	\N	{}
66666666-6666-6666-6666-666666666604	AST-IT-004	Cisco Switch 24 Port	44444444-4444-4444-4444-444444444412	33333333-3333-3333-3333-333333333321	22222222-2222-2222-2222-222222222201	\N	55555555-5555-5555-5555-555555555501	f	\N	deployed	1	FCW2134ABCD	Cisco	Catalyst 9300-24T	\N	\N	2023-12-10	45000000.00	1	1	2	5000000.00	60	\N	\N	2026-07-28 06:53:48.524635+00	2026-07-28 09:01:02.247492+00	11111111-1111-1111-1111-111111111111	\N	f	\N	\N	\N	{}	f	\N	f	2	\N	\N	\N	\N	\N	\N	{}
66666666-6666-6666-6666-666666666620	AST-IT-010	Dell Latitude 5530	44444444-4444-4444-4444-444444444411	33333333-3333-3333-3333-333333333322	22222222-2222-2222-2222-222222222201	\N	55555555-5555-5555-5555-555555555501	f	\N	in_maintenance	4	LAT5530XYZ	Dell	Latitude 5530	\N	\N	2022-05-15	18000000.00	1	1	1	3000000.00	48	\N	\N	2026-07-28 06:53:48.524635+00	2026-07-28 09:02:32.099616+00	11111111-1111-1111-1111-111111111111	\N	f	\N	\N	\N	{}	f	\N	f	2	\N	\N	\N	\N	\N	\N	{}
66666666-6666-6666-6666-666666666603	AST-IT-003	Dell PowerEdge R750	44444444-4444-4444-4444-444444444413	33333333-3333-3333-3333-333333333321	22222222-2222-2222-2222-222222222201	\N	55555555-5555-5555-5555-555555555501	f	\N	deployed	1	SRV20240001	Dell	PowerEdge R750	\N	{"OS": "", "RAM": "", "Processor": "", "Form Factor": "", "Storage (RAID)": ""}	2024-02-01	150000000.00	1	1	1	20000000.00	60	\N	\N	2026-07-28 06:53:48.524635+00	2026-07-28 09:03:56.474965+00	11111111-1111-1111-1111-111111111111	\N	f	\N	\N	\N	{}	f	\N	f	2	\N	\N	\N	\N	\N	\N	{}
3b6ecb6e-e9dd-49b4-b99e-f158a69c32e8	EQP-2024-002	Excavator Kobelco SK200	44444444-4444-4444-4444-444444444431	33333333-3333-3333-3333-333333333301	22222222-2222-2222-2222-222222222204	\N	\N	t	\N	rented_out	\N	\N	Kobelco	SK200-10	\N	\N	2023-02-20	1450000000.00	1	1	1	\N	120	\N	\N	2026-07-28 06:53:49.793435+00	2026-07-28 09:04:48.288561+00	11111111-1111-1111-1111-111111111111	\N	f	\N	\N	\N	{}	f	\N	f	2	\N	\N	\N	\N	\N	\N	{}
3b241ee4-d374-4217-b303-946da3bf0d00	EQP-2024-001	Excavator Komatsu PC200-10	44444444-4444-4444-4444-444444444431	33333333-3333-3333-3333-333333333301	22222222-2222-2222-2222-222222222204	\N	\N	t	\N	in_inventory	\N	\N	Komatsu	PC200-10	\N	\N	2023-01-15	1500000000.00	1	1	1	\N	120	\N	\N	2026-07-28 06:53:49.793435+00	2026-07-28 09:05:48.057418+00	11111111-1111-1111-1111-111111111111	\N	f	\N	\N	\N	{}	f	\N	f	2	\N	\N	\N	\N	\N	\N	{}
66666666-6666-6666-6666-666666666605	AST-IT-005	HP LaserJet Pro	44444444-4444-4444-4444-444444444414	33333333-3333-3333-3333-333333333322	22222222-2222-2222-2222-222222222201	\N	55555555-5555-5555-5555-555555555501	f	\N	in_inventory	2	VNB3X12345	HP	LaserJet Pro M428fdn	\N	\N	2023-08-15	8500000.00	1	1	1	1000000.00	48	\N	\N	2026-07-28 06:53:48.524635+00	2026-07-28 09:07:07.579052+00	11111111-1111-1111-1111-111111111111	\N	f	\N	\N	\N	{}	f	\N	f	2	\N	\N	\N	\N	\N	\N	{}
ac342b8f-571d-44c6-bcd1-32018899c2c1	OPS-004	Innova Zenix Hybrid (Direksi)	44444444-4444-4444-4444-444444444442	33333333-3333-3333-3333-333333333301	22222222-2222-2222-2222-222222222201	\N	\N	f	\N	deployed	\N	\N	Toyota	Innova Zenix Q	\N	\N	2024-01-15	620000000.00	1	1	1	\N	60	\N	\N	2026-07-28 06:53:49.793435+00	2026-07-28 09:08:46.175189+00	11111111-1111-1111-1111-111111111111	\N	f	\N	\N	\N	{}	f	{"vin": "", "brand": null, "color": "", "model": null, "asset_id": "ac342b8f-571d-44c6-bcd1-32018899c2c1", "capacity": "", "fuel_type": "", "created_at": "2026-07-28T06:53:49.793435Z", "kir_expiry": null, "tax_expiry": null, "updated_at": "2026-07-28T09:08:46.171527975Z", "bpkb_number": "", "stnk_expiry": null, "transmission": "", "engine_number": "", "license_plate": "", "odometer_last": null, "lapor_tiba_expiry": null, "heavy_equipment_tax_expiry": null}	f	2	\N	\N	\N	\N	\N	\N	{}
66666666-6666-6666-6666-666666666612	AST-FRN-002	Kursi Ergonomis	44444444-4444-4444-4444-444444444422	33333333-3333-3333-3333-333333333322	22222222-2222-2222-2222-222222222201	\N	55555555-5555-5555-5555-555555555502	f	\N	in_inventory	1	\N	Herman Miller	Aeron Chair	\N	\N	2024-01-10	18000000.00	1	1	5	2000000.00	96	\N	\N	2026-07-28 06:53:48.524635+00	2026-07-28 09:11:56.733128+00	11111111-1111-1111-1111-111111111111	\N	f	\N	\N	\N	{}	f	\N	f	2	\N	\N	\N	\N	\N	\N	{}
66666666-6666-6666-6666-666666666630	AST-IT-020	Old Desktop PC	44444444-4444-4444-4444-444444444411	\N	22222222-2222-2222-2222-222222222201	\N	55555555-5555-5555-5555-555555555501	f	\N	retired	5	HPD4005XYZ	HP	ProDesk 400 G5	\N	\N	2018-06-01	8000000.00	1	1	1	0.00	48	\N	\N	2026-07-28 06:53:48.524635+00	2026-07-28 09:15:35.126242+00	11111111-1111-1111-1111-111111111111	\N	f	\N	\N	\N	{}	f	\N	f	2	\N	\N	\N	\N	\N	\N	{}
66666666-6666-6666-6666-666666666621	AST-IT-011	Proyektor Epson	44444444-4444-4444-4444-444444444401	33333333-3333-3333-3333-333333333323	22222222-2222-2222-2222-222222222201	\N	55555555-5555-5555-5555-555555555501	f	\N	in_inventory	2	EPX51ABC123	Epson	EB-X51	\N	\N	2023-04-20	12000000.00	1	1	1	1500000.00	48	\N	\N	2026-07-28 06:53:48.524635+00	2026-07-28 09:17:03.008633+00	11111111-1111-1111-1111-111111111111	\N	f	\N	\N	\N	{}	f	\N	f	2	\N	\N	\N	\N	\N	\N	{}
66666666-6666-6666-6666-666666666602	AST-IT-002	ThinkPad X1 Carbon	44444444-4444-4444-4444-444444444411	33333333-3333-3333-3333-333333333322	22222222-2222-2222-2222-222222222201	\N	55555555-5555-5555-5555-555555555501	f	\N	in_inventory	2	PF3ABCD1234	Lenovo	ThinkPad X1 Carbon Gen 11	\N	\N	2023-06-20	25000000.00	1	1	1	4000000.00	48	\N	\N	2026-07-28 06:53:48.524635+00	2026-07-28 09:18:08.723289+00	11111111-1111-1111-1111-111111111111	\N	f	\N	\N	\N	{}	f	\N	f	2	\N	\N	\N	\N	\N	\N	{}
8120a96c-bbbd-4a13-9bd7-ed9388118ff6	OPS-003	Toyota Avanza Veloz (Pool)	44444444-4444-4444-4444-444444444442	33333333-3333-3333-3333-333333333301	22222222-2222-2222-2222-222222222202	\N	\N	f	\N	deployed	\N	\N	Toyota	Avanza Veloz	\N	\N	2023-11-20	280000000.00	1	1	1	\N	60	\N	\N	2026-07-28 06:53:49.793435+00	2026-07-28 09:19:10.278644+00	11111111-1111-1111-1111-111111111111	\N	f	\N	\N	\N	{}	f	{"vin": "", "brand": null, "color": "", "model": null, "asset_id": "8120a96c-bbbd-4a13-9bd7-ed9388118ff6", "capacity": "", "fuel_type": "", "created_at": "2026-07-28T06:53:49.793435Z", "kir_expiry": null, "tax_expiry": null, "updated_at": "2026-07-28T09:19:10.263006880Z", "bpkb_number": "", "stnk_expiry": null, "transmission": "", "engine_number": "", "license_plate": "", "odometer_last": null, "lapor_tiba_expiry": null, "heavy_equipment_tax_expiry": null}	f	2	\N	\N	\N	\N	\N	\N	{}
66666666-6666-6666-6666-666666666601	AST-IT-001	MacBook Pro 16" M3	44444444-4444-4444-4444-444444444411	33333333-3333-3333-3333-333333333322	22222222-2222-2222-2222-222222222201	\N	55555555-5555-5555-5555-555555555501	f	\N	in_inventory	1	C02YX1234567	Apple	MacBook Pro 16"	\N	\N	2024-01-15	35000000.00	1	1	1	5000000.00	48	\N	\N	2026-07-28 06:53:48.524635+00	2026-07-28 09:24:42.661093+00	11111111-1111-1111-1111-111111111111	\N	f	\N	\N	\N	{}	f	\N	f	2	\N	\N	\N	\N	\N	\N	{}
66666666-6666-6666-6666-666666666611	AST-FRN-001	Meja Kerja Executive	44444444-4444-4444-4444-444444444421	33333333-3333-3333-3333-333333333324	22222222-2222-2222-2222-222222222202	\N	55555555-5555-5555-5555-555555555502	f	\N	deployed	1	\N	Informa	Executive Desk 180	\N	\N	2023-03-01	5500000.00	1	1	1	500000.00	96	\N	\N	2026-07-28 06:53:48.524635+00	2026-07-28 09:30:16.154126+00	11111111-1111-1111-1111-111111111111	\N	f	\N	\N	\N	{}	f	\N	f	2	\N	\N	\N	\N	\N	\N	{}
bbbcd1cf-d71f-4510-8296-daa2c9542aeb	OPS-002	Mitsubishi Triton DC	44444444-4444-4444-4444-444444444442	33333333-3333-3333-3333-333333333301	22222222-2222-2222-2222-222222222204	\N	\N	f	\N	in_inventory	\N	\N	Mitsubishi	Triton GLS	\N	\N	2024-02-10	530000000.00	1	1	1	\N	60	\N	\N	2026-07-28 06:53:49.793435+00	2026-07-28 09:31:48.867746+00	11111111-1111-1111-1111-111111111111	\N	f	\N	\N	\N	{}	f	{"vin": "", "brand": null, "color": "", "model": null, "asset_id": "bbbcd1cf-d71f-4510-8296-daa2c9542aeb", "capacity": "", "fuel_type": "", "created_at": "2026-07-28T06:53:49.793435Z", "kir_expiry": null, "tax_expiry": null, "updated_at": "2026-07-28T09:31:48.851215925Z", "bpkb_number": "", "stnk_expiry": null, "transmission": "", "engine_number": "", "license_plate": "", "odometer_last": null, "lapor_tiba_expiry": null, "heavy_equipment_tax_expiry": null}	f	2	\N	\N	\N	\N	\N	\N	{}
26e7d22c-9594-432b-b858-545b6a48982f	EQP-2024-005	Motor Grader GD535	44444444-4444-4444-4444-444444444431	33333333-3333-3333-3333-333333333301	22222222-2222-2222-2222-222222222204	\N	\N	t	\N	in_inventory	\N	\N	Komatsu	GD535-5	\N	\N	2023-11-15	1900000000.00	1	1	1	\N	120	\N	\N	2026-07-28 06:53:49.793435+00	2026-07-28 09:32:56.168422+00	11111111-1111-1111-1111-111111111111	\N	f	\N	\N	\N	{}	f	\N	f	2	\N	\N	\N	\N	\N	\N	{}
96f1ca37-7132-437e-ac3c-ef0d0bd7aab3	DT-001	Hino 500 Ranger (DT-01)	44444444-4444-4444-4444-444444444441	33333333-3333-3333-3333-333333333301	22222222-2222-2222-2222-222222222204	\N	\N	t	\N	in_inventory	\N	\N	Hino	FM 260 JD	\N	\N	2023-05-01	850000000.00	1	1	1	\N	96	\N	\N	2026-07-28 06:53:49.793435+00	2026-07-28 07:20:35.619614+00	11111111-1111-1111-1111-111111111111	\N	f	\N	\N	\N	{}	f	{"vin": "", "brand": null, "color": "", "model": null, "asset_id": "96f1ca37-7132-437e-ac3c-ef0d0bd7aab3", "capacity": "", "fuel_type": "", "created_at": "2026-07-28T06:53:49.793435Z", "kir_expiry": null, "tax_expiry": null, "updated_at": "2026-07-28T07:20:35.607684208Z", "bpkb_number": "", "stnk_expiry": null, "transmission": "", "engine_number": "", "license_plate": "", "odometer_last": null, "lapor_tiba_expiry": null, "heavy_equipment_tax_expiry": null}	f	2	\N	\N	\N	\N	\N	\N	{}
2a13467e-2e81-4b46-a934-cd1564916ab0	DT-002	Hino 500 Ranger (DT-02)	44444444-4444-4444-4444-444444444441	33333333-3333-3333-3333-333333333301	22222222-2222-2222-2222-222222222204	\N	\N	t	\N	rented_out	\N	\N	Hino	FM 260 JD	\N	\N	2023-05-01	850000000.00	1	1	1	\N	96	\N	\N	2026-07-28 06:53:49.793435+00	2026-07-28 09:07:36.030605+00	11111111-1111-1111-1111-111111111111	\N	f	\N	\N	\N	{}	f	{"vin": "", "brand": null, "color": "", "model": null, "asset_id": "2a13467e-2e81-4b46-a934-cd1564916ab0", "capacity": "", "fuel_type": "", "created_at": "2026-07-28T06:53:49.793435Z", "kir_expiry": null, "tax_expiry": null, "updated_at": "2026-07-28T09:07:36.016375350Z", "bpkb_number": "", "stnk_expiry": null, "transmission": "", "engine_number": "", "license_plate": "", "odometer_last": null, "lapor_tiba_expiry": null, "heavy_equipment_tax_expiry": null}	f	2	\N	\N	\N	\N	\N	\N	{}
97832e0a-15cd-4e72-bb77-548028065fe5	DT-005	Hino 500 Ranger (DT-05)	44444444-4444-4444-4444-444444444441	33333333-3333-3333-3333-333333333301	22222222-2222-2222-2222-222222222204	\N	\N	t	\N	in_inventory	\N	\N	Hino	FM 260 JD	\N	\N	2023-05-01	850000000.00	1	1	1	\N	96	\N	\N	2026-07-28 06:53:49.793435+00	2026-07-28 09:07:55.530469+00	11111111-1111-1111-1111-111111111111	\N	f	\N	\N	\N	{}	f	{"vin": "", "brand": null, "color": "", "model": null, "asset_id": "97832e0a-15cd-4e72-bb77-548028065fe5", "capacity": "", "fuel_type": "", "created_at": "2026-07-28T06:53:49.793435Z", "kir_expiry": null, "tax_expiry": null, "updated_at": "2026-07-28T09:07:55.526478456Z", "bpkb_number": "", "stnk_expiry": null, "transmission": "", "engine_number": "", "license_plate": "", "odometer_last": null, "lapor_tiba_expiry": null, "heavy_equipment_tax_expiry": null}	f	2	\N	\N	\N	\N	\N	\N	{}
07626bdf-a194-43b9-9f80-2b2bd33c862e	DT-003	Isuzu Giga FVZ (DT-03)	44444444-4444-4444-4444-444444444441	33333333-3333-3333-3333-333333333301	22222222-2222-2222-2222-222222222204	\N	\N	t	\N	in_inventory	\N	\N	Isuzu	FVZ 34 N HP	\N	\N	2023-06-15	900000000.00	1	1	1	\N	96	\N	\N	2026-07-28 06:53:49.793435+00	2026-07-28 09:10:07.445612+00	11111111-1111-1111-1111-111111111111	\N	f	\N	\N	\N	{}	f	{"vin": "", "brand": null, "color": "", "model": null, "asset_id": "07626bdf-a194-43b9-9f80-2b2bd33c862e", "capacity": "", "fuel_type": "", "created_at": "2026-07-28T06:53:49.793435Z", "kir_expiry": null, "tax_expiry": null, "updated_at": "2026-07-28T09:10:07.442306533Z", "bpkb_number": "", "stnk_expiry": null, "transmission": "", "engine_number": "", "license_plate": "", "odometer_last": null, "lapor_tiba_expiry": null, "heavy_equipment_tax_expiry": null}	f	2	\N	\N	\N	\N	\N	\N	{}
867be6ac-a95c-43c7-b4aa-42fd7e395e29	OPS-001	Toyota Hilux DC 4x4	44444444-4444-4444-4444-444444444442	33333333-3333-3333-3333-333333333301	22222222-2222-2222-2222-222222222204	\N	\N	f	\N	deployed	\N	\N	Toyota	Hilux Double Cabin	\N	\N	2024-01-05	550000000.00	1	1	1	\N	60	\N	\N	2026-07-28 06:53:49.793435+00	2026-07-28 09:20:23.477667+00	11111111-1111-1111-1111-111111111111	\N	f	\N	\N	\N	{}	f	{"vin": "", "brand": null, "color": "", "model": null, "asset_id": "867be6ac-a95c-43c7-b4aa-42fd7e395e29", "capacity": "", "fuel_type": "", "created_at": "2026-07-28T06:53:49.793435Z", "kir_expiry": null, "tax_expiry": null, "updated_at": "2026-07-28T09:20:23.473138973Z", "bpkb_number": "", "stnk_expiry": null, "transmission": "", "engine_number": "", "license_plate": "", "odometer_last": null, "lapor_tiba_expiry": null, "heavy_equipment_tax_expiry": null}	f	2	\N	\N	\N	\N	\N	\N	{}
\.


--
-- Data for Name: attendance_records; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.attendance_records (id, employee_id, check_in_time, check_out_time, check_in_location_id, check_out_location_id, check_in_lat, check_in_long, check_out_lat, check_out_long, check_in_status, check_out_status, is_mock_location, device_info, notes, check_in_photo_url, check_out_photo_url, created_at) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, table_name, record_id, action, old_values, new_values, user_id, ip_address, user_agent, created_at, changed_fields) FROM stdin;
7190e3ae-471c-411c-a7e1-de12bd8c6eb5	assets	66666666-6666-6666-6666-666666666601	INSERT	\N	{"id": "66666666-6666-6666-6666-666666666601", "name": "MacBook Pro 16\\" M3", "brand": "Apple", "model": "MacBook Pro 16\\"", "notes": null, "status": "in_inventory", "unit_id": 1, "quantity": 1, "is_rental": false, "vendor_id": "55555555-5555-5555-5555-555555555501", "asset_code": "AST-IT-001", "created_at": "2026-07-28T06:53:48.524635+00:00", "updated_at": "2026-07-28T06:53:48.524635+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444411", "currency_id": 1, "location_id": "33333333-3333-3333-3333-333333333322", "qr_code_url": null, "condition_id": 1, "department_id": "22222222-2222-2222-2222-222222222201", "purchase_date": "2024-01-15", "serial_number": "C02YX1234567", "purchase_price": 35000000.00, "residual_value": 5000000.00, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "year_manufacture": null, "useful_life_months": 48}	\N	\N	\N	2026-07-28 06:53:48.524635+00	\N
d4d6223e-4e45-488c-b639-ff5bff4046fd	assets	66666666-6666-6666-6666-666666666602	INSERT	\N	{"id": "66666666-6666-6666-6666-666666666602", "name": "ThinkPad X1 Carbon", "brand": "Lenovo", "model": "ThinkPad X1 Carbon Gen 11", "notes": null, "status": "in_inventory", "unit_id": 1, "quantity": 1, "is_rental": false, "vendor_id": "55555555-5555-5555-5555-555555555501", "asset_code": "AST-IT-002", "created_at": "2026-07-28T06:53:48.524635+00:00", "updated_at": "2026-07-28T06:53:48.524635+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444411", "currency_id": 1, "location_id": "33333333-3333-3333-3333-333333333322", "qr_code_url": null, "condition_id": 2, "department_id": "22222222-2222-2222-2222-222222222201", "purchase_date": "2023-06-20", "serial_number": "PF3ABCD1234", "purchase_price": 25000000.00, "residual_value": 4000000.00, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "year_manufacture": null, "useful_life_months": 48}	\N	\N	\N	2026-07-28 06:53:48.524635+00	\N
130c6b04-8ee0-46e1-b177-5070fa3cb5eb	assets	66666666-6666-6666-6666-666666666603	INSERT	\N	{"id": "66666666-6666-6666-6666-666666666603", "name": "Dell PowerEdge R750", "brand": "Dell", "model": "PowerEdge R750", "notes": null, "status": "deployed", "unit_id": 1, "quantity": 1, "is_rental": false, "vendor_id": "55555555-5555-5555-5555-555555555501", "asset_code": "AST-IT-003", "created_at": "2026-07-28T06:53:48.524635+00:00", "updated_at": "2026-07-28T06:53:48.524635+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444413", "currency_id": 1, "location_id": "33333333-3333-3333-3333-333333333321", "qr_code_url": null, "condition_id": 1, "department_id": "22222222-2222-2222-2222-222222222201", "purchase_date": "2024-02-01", "serial_number": "SRV20240001", "purchase_price": 150000000.00, "residual_value": 20000000.00, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "year_manufacture": null, "useful_life_months": 60}	\N	\N	\N	2026-07-28 06:53:48.524635+00	\N
bf2abaeb-5d43-4fd6-80d4-db1bdb37e547	assets	66666666-6666-6666-6666-666666666604	INSERT	\N	{"id": "66666666-6666-6666-6666-666666666604", "name": "Cisco Switch 24 Port", "brand": "Cisco", "model": "Catalyst 9300-24T", "notes": null, "status": "deployed", "unit_id": 1, "quantity": 2, "is_rental": false, "vendor_id": "55555555-5555-5555-5555-555555555501", "asset_code": "AST-IT-004", "created_at": "2026-07-28T06:53:48.524635+00:00", "updated_at": "2026-07-28T06:53:48.524635+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444412", "currency_id": 1, "location_id": "33333333-3333-3333-3333-333333333321", "qr_code_url": null, "condition_id": 1, "department_id": "22222222-2222-2222-2222-222222222201", "purchase_date": "2023-12-10", "serial_number": "FCW2134ABCD", "purchase_price": 45000000.00, "residual_value": 5000000.00, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "year_manufacture": null, "useful_life_months": 60}	\N	\N	\N	2026-07-28 06:53:48.524635+00	\N
8566e964-653e-49c5-96fe-53f45173adf4	assets	66666666-6666-6666-6666-666666666605	INSERT	\N	{"id": "66666666-6666-6666-6666-666666666605", "name": "HP LaserJet Pro", "brand": "HP", "model": "LaserJet Pro M428fdn", "notes": null, "status": "in_inventory", "unit_id": 1, "quantity": 1, "is_rental": false, "vendor_id": "55555555-5555-5555-5555-555555555501", "asset_code": "AST-IT-005", "created_at": "2026-07-28T06:53:48.524635+00:00", "updated_at": "2026-07-28T06:53:48.524635+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444414", "currency_id": 1, "location_id": "33333333-3333-3333-3333-333333333322", "qr_code_url": null, "condition_id": 2, "department_id": "22222222-2222-2222-2222-222222222201", "purchase_date": "2023-08-15", "serial_number": "VNB3X12345", "purchase_price": 8500000.00, "residual_value": 1000000.00, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "year_manufacture": null, "useful_life_months": 48}	\N	\N	\N	2026-07-28 06:53:48.524635+00	\N
0b239ecb-04ba-480a-8b61-f11d979e48a5	assets	66666666-6666-6666-6666-666666666611	INSERT	\N	{"id": "66666666-6666-6666-6666-666666666611", "name": "Meja Kerja Executive", "brand": "Informa", "model": "Executive Desk 180", "notes": null, "status": "deployed", "unit_id": 1, "quantity": 1, "is_rental": false, "vendor_id": "55555555-5555-5555-5555-555555555502", "asset_code": "AST-FRN-001", "created_at": "2026-07-28T06:53:48.524635+00:00", "updated_at": "2026-07-28T06:53:48.524635+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444421", "currency_id": 1, "location_id": "33333333-3333-3333-3333-333333333324", "qr_code_url": null, "condition_id": 1, "department_id": "22222222-2222-2222-2222-222222222202", "purchase_date": "2023-03-01", "serial_number": null, "purchase_price": 5500000.00, "residual_value": 500000.00, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "year_manufacture": null, "useful_life_months": 96}	\N	\N	\N	2026-07-28 06:53:48.524635+00	\N
9f1b42ba-7406-4941-a2f5-8afd43698ced	assets	66666666-6666-6666-6666-666666666612	INSERT	\N	{"id": "66666666-6666-6666-6666-666666666612", "name": "Kursi Ergonomis", "brand": "Herman Miller", "model": "Aeron Chair", "notes": null, "status": "in_inventory", "unit_id": 1, "quantity": 5, "is_rental": false, "vendor_id": "55555555-5555-5555-5555-555555555502", "asset_code": "AST-FRN-002", "created_at": "2026-07-28T06:53:48.524635+00:00", "updated_at": "2026-07-28T06:53:48.524635+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444422", "currency_id": 1, "location_id": "33333333-3333-3333-3333-333333333322", "qr_code_url": null, "condition_id": 1, "department_id": "22222222-2222-2222-2222-222222222201", "purchase_date": "2024-01-10", "serial_number": null, "purchase_price": 18000000.00, "residual_value": 2000000.00, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "year_manufacture": null, "useful_life_months": 96}	\N	\N	\N	2026-07-28 06:53:48.524635+00	\N
fd573b8f-4dfe-4372-992c-0e8f1da8ff96	assets	66666666-6666-6666-6666-666666666620	INSERT	\N	{"id": "66666666-6666-6666-6666-666666666620", "name": "Dell Latitude 5530", "brand": "Dell", "model": "Latitude 5530", "notes": null, "status": "in_maintenance", "unit_id": 1, "quantity": 1, "is_rental": false, "vendor_id": "55555555-5555-5555-5555-555555555501", "asset_code": "AST-IT-010", "created_at": "2026-07-28T06:53:48.524635+00:00", "updated_at": "2026-07-28T06:53:48.524635+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444411", "currency_id": 1, "location_id": "33333333-3333-3333-3333-333333333322", "qr_code_url": null, "condition_id": 4, "department_id": "22222222-2222-2222-2222-222222222201", "purchase_date": "2022-05-15", "serial_number": "LAT5530XYZ", "purchase_price": 18000000.00, "residual_value": 3000000.00, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "year_manufacture": null, "useful_life_months": 48}	\N	\N	\N	2026-07-28 06:53:48.524635+00	\N
f54e737b-8c97-4068-b540-17f52bf85c68	assets	66666666-6666-6666-6666-666666666621	INSERT	\N	{"id": "66666666-6666-6666-6666-666666666621", "name": "Proyektor Epson", "brand": "Epson", "model": "EB-X51", "notes": null, "status": "in_inventory", "unit_id": 1, "quantity": 1, "is_rental": false, "vendor_id": "55555555-5555-5555-5555-555555555501", "asset_code": "AST-IT-011", "created_at": "2026-07-28T06:53:48.524635+00:00", "updated_at": "2026-07-28T06:53:48.524635+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444401", "currency_id": 1, "location_id": "33333333-3333-3333-3333-333333333323", "qr_code_url": null, "condition_id": 2, "department_id": "22222222-2222-2222-2222-222222222201", "purchase_date": "2023-04-20", "serial_number": "EPX51ABC123", "purchase_price": 12000000.00, "residual_value": 1500000.00, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "year_manufacture": null, "useful_life_months": 48}	\N	\N	\N	2026-07-28 06:53:48.524635+00	\N
a163e724-2bf9-40b7-8e4a-8736992063d6	assets	66666666-6666-6666-6666-666666666630	INSERT	\N	{"id": "66666666-6666-6666-6666-666666666630", "name": "Old Desktop PC", "brand": "HP", "model": "ProDesk 400 G5", "notes": null, "status": "retired", "unit_id": 1, "quantity": 1, "is_rental": false, "vendor_id": "55555555-5555-5555-5555-555555555501", "asset_code": "AST-IT-020", "created_at": "2026-07-28T06:53:48.524635+00:00", "updated_at": "2026-07-28T06:53:48.524635+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444411", "currency_id": 1, "location_id": null, "qr_code_url": null, "condition_id": 5, "department_id": "22222222-2222-2222-2222-222222222201", "purchase_date": "2018-06-01", "serial_number": "HPD4005XYZ", "purchase_price": 8000000.00, "residual_value": 0.00, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "year_manufacture": null, "useful_life_months": 48}	\N	\N	\N	2026-07-28 06:53:48.524635+00	\N
38de0864-44d9-41b8-bcb3-c925106cbf7d	maintenance_work_orders	88888888-8888-8888-8888-888888888801	INSERT	\N	{"id": "88888888-8888-8888-8888-888888888801", "status": "in_progress", "wo_type": "corrective", "asset_id": "66666666-6666-6666-6666-666666666620", "due_date": "2024-01-10", "priority": "high", "vendor_id": null, "wo_number": "WO-20240107-001", "created_at": "2026-07-28T06:53:48.524635+00:00", "created_by": "00000000-0000-0000-0000-000000000002", "labor_cost": null, "parts_cost": null, "updated_at": "2026-07-28T06:53:48.524635+00:00", "actual_cost": null, "approved_by": null, "actual_hours": null, "completed_by": null, "estimated_cost": null, "scheduled_date": "2024-01-07", "work_performed": null, "actual_end_date": null, "estimated_hours": null, "recommendations": null, "completion_notes": null, "customer_signoff": null, "actual_start_date": null, "technician_signoff": null, "assigned_technician": null, "problem_description": "Screen tidak menyala, perlu penggantian", "safety_requirements": null, "lockout_tagout_required": false}	\N	\N	\N	2026-07-28 06:53:48.524635+00	\N
4f1d83ea-e4ae-4961-98c3-88d9e2480790	maintenance_work_orders	88888888-8888-8888-8888-888888888802	INSERT	\N	{"id": "88888888-8888-8888-8888-888888888802", "status": "pending", "wo_type": "preventive", "asset_id": "66666666-6666-6666-6666-666666666603", "due_date": "2024-01-20", "priority": "medium", "vendor_id": null, "wo_number": "WO-20240110-001", "created_at": "2026-07-28T06:53:48.524635+00:00", "created_by": "00000000-0000-0000-0000-000000000002", "labor_cost": null, "parts_cost": null, "updated_at": "2026-07-28T06:53:48.524635+00:00", "actual_cost": null, "approved_by": null, "actual_hours": null, "completed_by": null, "estimated_cost": null, "scheduled_date": "2024-01-15", "work_performed": null, "actual_end_date": null, "estimated_hours": null, "recommendations": null, "completion_notes": null, "customer_signoff": null, "actual_start_date": null, "technician_signoff": null, "assigned_technician": null, "problem_description": "Scheduled quarterly maintenance", "safety_requirements": null, "lockout_tagout_required": false}	\N	\N	\N	2026-07-28 06:53:48.524635+00	\N
8d1431b1-13f3-4fb7-b53d-10f09854c264	assets	3b241ee4-d374-4217-b303-946da3bf0d00	INSERT	\N	{"id": "3b241ee4-d374-4217-b303-946da3bf0d00", "name": "Excavator Komatsu PC200-10", "brand": "Komatsu", "model": "PC200-10", "notes": null, "photos": {}, "status": "available", "is_fuel": false, "sold_to": null, "unit_id": 1, "quantity": 1, "is_rental": true, "sale_date": null, "vendor_id": null, "asset_code": "EQP-2024-001", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T06:53:49.793435+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444431", "currency_id": 1, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2023-01-15", "serial_number": null, "purchase_price": 1500000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": null, "year_manufacture": null, "useful_life_months": 120}	\N	\N	\N	2026-07-28 06:53:49.793435+00	\N
4c19dca5-54ab-4263-93c4-ede5396276c9	assets	3b6ecb6e-e9dd-49b4-b99e-f158a69c32e8	INSERT	\N	{"id": "3b6ecb6e-e9dd-49b4-b99e-f158a69c32e8", "name": "Excavator Kobelco SK200", "brand": "Kobelco", "model": "SK200-10", "notes": null, "photos": {}, "status": "rented_out", "is_fuel": false, "sold_to": null, "unit_id": 1, "quantity": 1, "is_rental": true, "sale_date": null, "vendor_id": null, "asset_code": "EQP-2024-002", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T06:53:49.793435+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444431", "currency_id": 1, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2023-02-20", "serial_number": null, "purchase_price": 1450000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": null, "year_manufacture": null, "useful_life_months": 120}	\N	\N	\N	2026-07-28 06:53:49.793435+00	\N
8b866ec1-06b9-477a-b375-62ad42321858	assets	79e7d587-265f-46d7-ae06-8070f9a537b2	INSERT	\N	{"id": "79e7d587-265f-46d7-ae06-8070f9a537b2", "name": "Bulldozer CAT D6R", "brand": "Caterpillar", "model": "D6R XL", "notes": null, "photos": {}, "status": "available", "is_fuel": false, "sold_to": null, "unit_id": 1, "quantity": 1, "is_rental": true, "sale_date": null, "vendor_id": null, "asset_code": "EQP-2024-003", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T06:53:49.793435+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444431", "currency_id": 1, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2022-06-10", "serial_number": null, "purchase_price": 2200000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": null, "year_manufacture": null, "useful_life_months": 120}	\N	\N	\N	2026-07-28 06:53:49.793435+00	\N
39b9105f-c126-4971-99d9-36590d3f947a	assets	ad65e6f6-9b65-42f6-a5bb-a8f442379778	INSERT	\N	{"id": "ad65e6f6-9b65-42f6-a5bb-a8f442379778", "name": "Wheel Loader WA380", "brand": "Komatsu", "model": "WA380-6", "notes": null, "photos": {}, "status": "maintenance", "is_fuel": false, "sold_to": null, "unit_id": 1, "quantity": 1, "is_rental": true, "sale_date": null, "vendor_id": null, "asset_code": "EQP-2024-004", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T06:53:49.793435+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444431", "currency_id": 1, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2023-08-01", "serial_number": null, "purchase_price": 1800000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": null, "year_manufacture": null, "useful_life_months": 120}	\N	\N	\N	2026-07-28 06:53:49.793435+00	\N
8179a8e3-7be7-497d-ba6d-6179061c264c	assets	26e7d22c-9594-432b-b858-545b6a48982f	INSERT	\N	{"id": "26e7d22c-9594-432b-b858-545b6a48982f", "name": "Motor Grader GD535", "brand": "Komatsu", "model": "GD535-5", "notes": null, "photos": {}, "status": "available", "is_fuel": false, "sold_to": null, "unit_id": 1, "quantity": 1, "is_rental": true, "sale_date": null, "vendor_id": null, "asset_code": "EQP-2024-005", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T06:53:49.793435+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444431", "currency_id": 1, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2023-11-15", "serial_number": null, "purchase_price": 1900000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": null, "year_manufacture": null, "useful_life_months": 120}	\N	\N	\N	2026-07-28 06:53:49.793435+00	\N
0451b2d1-06e8-4806-9d4f-84367ba8a755	assets	96f1ca37-7132-437e-ac3c-ef0d0bd7aab3	INSERT	\N	{"id": "96f1ca37-7132-437e-ac3c-ef0d0bd7aab3", "name": "Hino 500 Ranger (DT-01)", "brand": "Hino", "model": "FM 260 JD", "notes": null, "photos": {}, "status": "available", "is_fuel": false, "sold_to": null, "unit_id": 1, "quantity": 1, "is_rental": true, "sale_date": null, "vendor_id": null, "asset_code": "DT-001", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T06:53:49.793435+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444441", "currency_id": 1, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2023-05-01", "serial_number": null, "purchase_price": 850000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"color": "Green", "capacity": "20 Ton", "fuel_type": "Diesel", "license_plate": "B 9001 TXT"}, "year_manufacture": null, "useful_life_months": 96}	\N	\N	\N	2026-07-28 06:53:49.793435+00	\N
cad75167-e2f2-4792-b10f-c76db32e4eed	assets	2a13467e-2e81-4b46-a934-cd1564916ab0	INSERT	\N	{"id": "2a13467e-2e81-4b46-a934-cd1564916ab0", "name": "Hino 500 Ranger (DT-02)", "brand": "Hino", "model": "FM 260 JD", "notes": null, "photos": {}, "status": "rented_out", "is_fuel": false, "sold_to": null, "unit_id": 1, "quantity": 1, "is_rental": true, "sale_date": null, "vendor_id": null, "asset_code": "DT-002", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T06:53:49.793435+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444441", "currency_id": 1, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2023-05-01", "serial_number": null, "purchase_price": 850000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"color": "Green", "capacity": "20 Ton", "fuel_type": "Diesel", "license_plate": "B 9002 TXT"}, "year_manufacture": null, "useful_life_months": 96}	\N	\N	\N	2026-07-28 06:53:49.793435+00	\N
3e493f8d-910d-4cc0-8550-d19f64feb236	assets	07626bdf-a194-43b9-9f80-2b2bd33c862e	INSERT	\N	{"id": "07626bdf-a194-43b9-9f80-2b2bd33c862e", "name": "Isuzu Giga FVZ (DT-03)", "brand": "Isuzu", "model": "FVZ 34 N HP", "notes": null, "photos": {}, "status": "available", "is_fuel": false, "sold_to": null, "unit_id": 1, "quantity": 1, "is_rental": true, "sale_date": null, "vendor_id": null, "asset_code": "DT-003", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T06:53:49.793435+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444441", "currency_id": 1, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2023-06-15", "serial_number": null, "purchase_price": 900000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"color": "White", "capacity": "24 Ton", "fuel_type": "Diesel", "license_plate": "B 9003 TXT"}, "year_manufacture": null, "useful_life_months": 96}	\N	\N	\N	2026-07-28 06:53:49.793435+00	\N
5e4e5e48-a29e-4c81-b99e-b6bf00473102	assets	36772359-e9c7-4d3a-b276-540e24cb3e60	INSERT	\N	{"id": "36772359-e9c7-4d3a-b276-540e24cb3e60", "name": "Fuso Fighter X (DT-04)", "brand": "Mitsubishi", "model": "FN 62 F HD", "notes": null, "photos": {}, "status": "maintenance", "is_fuel": false, "sold_to": null, "unit_id": 1, "quantity": 1, "is_rental": true, "sale_date": null, "vendor_id": null, "asset_code": "DT-004", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T06:53:49.793435+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444441", "currency_id": 1, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2023-07-20", "serial_number": null, "purchase_price": 880000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"color": "Orange", "capacity": "22 Ton", "fuel_type": "Diesel", "license_plate": "B 9004 TXT"}, "year_manufacture": null, "useful_life_months": 96}	\N	\N	\N	2026-07-28 06:53:49.793435+00	\N
4603bea9-8c43-4301-b044-3451c58dbf46	assets	97832e0a-15cd-4e72-bb77-548028065fe5	INSERT	\N	{"id": "97832e0a-15cd-4e72-bb77-548028065fe5", "name": "Hino 500 Ranger (DT-05)", "brand": "Hino", "model": "FM 260 JD", "notes": null, "photos": {}, "status": "available", "is_fuel": false, "sold_to": null, "unit_id": 1, "quantity": 1, "is_rental": true, "sale_date": null, "vendor_id": null, "asset_code": "DT-005", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T06:53:49.793435+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444441", "currency_id": 1, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2023-05-01", "serial_number": null, "purchase_price": 850000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"color": "Green", "capacity": "20 Ton", "fuel_type": "Diesel", "license_plate": "B 9005 TXT"}, "year_manufacture": null, "useful_life_months": 96}	\N	\N	\N	2026-07-28 06:53:49.793435+00	\N
1ec4024a-4d75-4e5d-ac51-3ec5a806389c	assets	867be6ac-a95c-43c7-b4aa-42fd7e395e29	INSERT	\N	{"id": "867be6ac-a95c-43c7-b4aa-42fd7e395e29", "name": "Toyota Hilux DC 4x4", "brand": "Toyota", "model": "Hilux Double Cabin", "notes": null, "photos": {}, "status": "in_use", "is_fuel": false, "sold_to": null, "unit_id": 1, "quantity": 1, "is_rental": false, "sale_date": null, "vendor_id": null, "asset_code": "OPS-001", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T06:53:49.793435+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444442", "currency_id": 1, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2024-01-05", "serial_number": null, "purchase_price": 550000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"color": "White", "capacity": "5 Seater", "fuel_type": "Diesel", "license_plate": "B 1234 ABC"}, "year_manufacture": null, "useful_life_months": 60}	\N	\N	\N	2026-07-28 06:53:49.793435+00	\N
deb52f54-b7e4-4194-a4bf-ef6e08326cad	assets	bbbcd1cf-d71f-4510-8296-daa2c9542aeb	INSERT	\N	{"id": "bbbcd1cf-d71f-4510-8296-daa2c9542aeb", "name": "Mitsubishi Triton DC", "brand": "Mitsubishi", "model": "Triton GLS", "notes": null, "photos": {}, "status": "available", "is_fuel": false, "sold_to": null, "unit_id": 1, "quantity": 1, "is_rental": false, "sale_date": null, "vendor_id": null, "asset_code": "OPS-002", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T06:53:49.793435+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444442", "currency_id": 1, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2024-02-10", "serial_number": null, "purchase_price": 530000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"color": "Silver", "capacity": "5 Seater", "fuel_type": "Diesel", "license_plate": "B 1235 ABC"}, "year_manufacture": null, "useful_life_months": 60}	\N	\N	\N	2026-07-28 06:53:49.793435+00	\N
a5f73fd1-262f-404f-a98c-a79003942558	assets	8120a96c-bbbd-4a13-9bd7-ed9388118ff6	INSERT	\N	{"id": "8120a96c-bbbd-4a13-9bd7-ed9388118ff6", "name": "Toyota Avanza Veloz (Pool)", "brand": "Toyota", "model": "Avanza Veloz", "notes": null, "photos": {}, "status": "available", "is_fuel": false, "sold_to": null, "unit_id": 1, "quantity": 1, "is_rental": false, "sale_date": null, "vendor_id": null, "asset_code": "OPS-003", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T06:53:49.793435+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444442", "currency_id": 1, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222202", "purchase_date": "2023-11-20", "serial_number": null, "purchase_price": 280000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"color": "Black", "capacity": "7 Seater", "fuel_type": "Petrol", "license_plate": "B 1236 ABC"}, "year_manufacture": null, "useful_life_months": 60}	\N	\N	\N	2026-07-28 06:53:49.793435+00	\N
ff5efb90-7ce6-4c2d-8bb1-52083a932900	assets	ac342b8f-571d-44c6-bcd1-32018899c2c1	INSERT	\N	{"id": "ac342b8f-571d-44c6-bcd1-32018899c2c1", "name": "Innova Zenix Hybrid (Direksi)", "brand": "Toyota", "model": "Innova Zenix Q", "notes": null, "photos": {}, "status": "in_use", "is_fuel": false, "sold_to": null, "unit_id": 1, "quantity": 1, "is_rental": false, "sale_date": null, "vendor_id": null, "asset_code": "OPS-004", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T06:53:49.793435+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444442", "currency_id": 1, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222201", "purchase_date": "2024-01-15", "serial_number": null, "purchase_price": 620000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"color": "Black", "capacity": "7 Seater", "fuel_type": "Hybrid", "license_plate": "B 1 RFS"}, "year_manufacture": null, "useful_life_months": 60}	\N	\N	\N	2026-07-28 06:53:49.793435+00	\N
ab35412e-e428-45d7-8ec7-498b74849f56	assets	f90d66ac-6150-449c-9550-f8fe5c0fef3e	INSERT	\N	{"id": "f90d66ac-6150-449c-9550-f8fe5c0fef3e", "name": "Daihatsu Gran Max (Logistik)", "brand": "Daihatsu", "model": "Gran Max BV", "notes": null, "photos": {}, "status": "available", "is_fuel": false, "sold_to": null, "unit_id": 1, "quantity": 1, "is_rental": false, "sale_date": null, "vendor_id": null, "asset_code": "OPS-005", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T06:53:49.793435+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444442", "currency_id": 1, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2023-10-05", "serial_number": null, "purchase_price": 180000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"color": "White", "capacity": "Cargo", "fuel_type": "Petrol", "license_plate": "B 9876 XYZ"}, "year_manufacture": null, "useful_life_months": 60}	\N	\N	\N	2026-07-28 06:53:49.793435+00	\N
b302b6ef-f0c8-4152-8811-db594200a9c7	asset_loans	1f2664df-64e9-4e83-be23-d345ee89800e	INSERT	\N	{"id": "1f2664df-64e9-4e83-be23-d345ee89800e", "status": "in_use", "asset_id": "8120a96c-bbbd-4a13-9bd7-ed9388118ff6", "loan_date": "2026-07-28", "created_at": "2026-07-28T06:53:49.823749+00:00", "updated_at": "2026-07-28T06:53:49.823749+00:00", "approver_id": null, "borrower_id": "00000000-0000-0000-0000-000000000004", "employee_id": null, "loan_number": "LOAN-DEMO-001", "penalty_paid": false, "checked_in_by": null, "damage_photos": null, "return_photos": null, "checked_out_by": null, "deposit_amount": null, "penalty_amount": null, "terms_accepted": true, "condition_after": null, "check_out_photos": null, "condition_before": null, "deposit_returned": false, "actual_return_date": null, "agreement_document": null, "damage_description": null, "expected_return_date": "2026-08-04"}	\N	\N	\N	2026-07-28 06:53:49.823749+00	\N
5aebb1b4-5549-43fd-a2a2-a3b2501f4700	assets	8120a96c-bbbd-4a13-9bd7-ed9388118ff6	UPDATE	{"id": "8120a96c-bbbd-4a13-9bd7-ed9388118ff6", "name": "Toyota Avanza Veloz (Pool)", "brand": "Toyota", "model": "Avanza Veloz", "notes": null, "photos": {}, "status": "available", "is_fuel": false, "sold_to": null, "unit_id": 1, "quantity": 1, "is_rental": false, "sale_date": null, "vendor_id": null, "asset_code": "OPS-003", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T06:53:49.793435+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444442", "currency_id": 1, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222202", "purchase_date": "2023-11-20", "serial_number": null, "purchase_price": 280000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"color": "Black", "capacity": "7 Seater", "fuel_type": "Petrol", "license_plate": "B 1236 ABC"}, "year_manufacture": null, "useful_life_months": 60}	{"id": "8120a96c-bbbd-4a13-9bd7-ed9388118ff6", "name": "Toyota Avanza Veloz (Pool)", "brand": "Toyota", "model": "Avanza Veloz", "notes": null, "photos": {}, "status": "in_use", "is_fuel": false, "sold_to": null, "unit_id": 1, "quantity": 1, "is_rental": false, "sale_date": null, "vendor_id": null, "asset_code": "OPS-003", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T06:53:49.823749+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444442", "currency_id": 1, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222202", "purchase_date": "2023-11-20", "serial_number": null, "purchase_price": 280000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"color": "Black", "capacity": "7 Seater", "fuel_type": "Petrol", "license_plate": "B 1236 ABC"}, "year_manufacture": null, "useful_life_months": 60}	\N	\N	\N	2026-07-28 06:53:49.823749+00	{status,updated_at}
33462592-d70e-4a12-8896-3d8310131433	assets	f90d66ac-6150-449c-9550-f8fe5c0fef3e	UPDATE	{"id": "f90d66ac-6150-449c-9550-f8fe5c0fef3e", "name": "Daihatsu Gran Max (Logistik)", "brand": "Daihatsu", "model": "Gran Max BV", "notes": null, "photos": {}, "status": "available", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 1, "quantity": 1, "is_rental": false, "sale_date": null, "vendor_id": null, "asset_code": "OPS-005", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T06:53:49.793435+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444442", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2023-10-05", "serial_number": null, "funding_source": null, "purchase_price": 180000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"color": "White", "capacity": "Cargo", "fuel_type": "Petrol", "license_plate": "B 9876 XYZ"}, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 60}	{"id": "f90d66ac-6150-449c-9550-f8fe5c0fef3e", "name": "Daihatsu Gran Max (Logistik)", "brand": "Daihatsu", "model": "Gran Max BV", "notes": null, "photos": {}, "status": "in_inventory", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 2, "quantity": 1, "is_rental": false, "sale_date": null, "vendor_id": null, "asset_code": "OPS-005", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T07:07:30.869448+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444442", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2023-10-05", "serial_number": null, "funding_source": null, "purchase_price": 180000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"color": "White", "capacity": "Cargo", "fuel_type": "Petrol", "license_plate": "B 9876 XYZ"}, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 60}	\N	\N	\N	2026-07-28 07:07:30.869448+00	{status,version,updated_at}
cecc0d1f-2f4b-4034-98ab-95dab85310cd	assets	f90d66ac-6150-449c-9550-f8fe5c0fef3e	UPDATE	{"id": "f90d66ac-6150-449c-9550-f8fe5c0fef3e", "name": "Daihatsu Gran Max (Logistik)", "brand": "Daihatsu", "model": "Gran Max BV", "notes": null, "photos": {}, "status": "in_inventory", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 2, "quantity": 1, "is_rental": false, "sale_date": null, "vendor_id": null, "asset_code": "OPS-005", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T07:07:30.869448+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444442", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2023-10-05", "serial_number": null, "funding_source": null, "purchase_price": 180000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"color": "White", "capacity": "Cargo", "fuel_type": "Petrol", "license_plate": "B 9876 XYZ"}, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 60}	{"id": "f90d66ac-6150-449c-9550-f8fe5c0fef3e", "name": "Daihatsu Gran Max (Logistik)", "brand": "Daihatsu", "model": "Gran Max BV", "notes": null, "photos": {}, "status": "in_inventory", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 2, "quantity": 1, "is_rental": false, "sale_date": null, "vendor_id": null, "asset_code": "OPS-005", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T07:07:30.98052+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444442", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2023-10-05", "serial_number": null, "funding_source": null, "purchase_price": 180000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"vin": "", "brand": null, "color": "", "model": null, "asset_id": "f90d66ac-6150-449c-9550-f8fe5c0fef3e", "capacity": "", "fuel_type": "", "created_at": "2026-07-28T06:53:49.793435Z", "kir_expiry": null, "tax_expiry": null, "updated_at": "2026-07-28T07:07:30.969022307Z", "bpkb_number": "", "stnk_expiry": null, "transmission": "", "engine_number": "", "license_plate": "", "odometer_last": null, "lapor_tiba_expiry": null, "heavy_equipment_tax_expiry": null}, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 60}	\N	\N	\N	2026-07-28 07:07:30.98052+00	{updated_at,vehicle_details}
02726576-7f55-420d-b02e-91121878aef3	assets	97832e0a-15cd-4e72-bb77-548028065fe5	UPDATE	{"id": "97832e0a-15cd-4e72-bb77-548028065fe5", "name": "Hino 500 Ranger (DT-05)", "brand": "Hino", "model": "FM 260 JD", "notes": null, "photos": {}, "status": "in_inventory", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 2, "quantity": 1, "is_rental": true, "sale_date": null, "vendor_id": null, "asset_code": "DT-005", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T09:07:55.482475+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444441", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2023-05-01", "serial_number": null, "funding_source": null, "purchase_price": 850000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"color": "Green", "capacity": "20 Ton", "fuel_type": "Diesel", "license_plate": "B 9005 TXT"}, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 96}	{"id": "97832e0a-15cd-4e72-bb77-548028065fe5", "name": "Hino 500 Ranger (DT-05)", "brand": "Hino", "model": "FM 260 JD", "notes": null, "photos": {}, "status": "in_inventory", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 2, "quantity": 1, "is_rental": true, "sale_date": null, "vendor_id": null, "asset_code": "DT-005", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T09:07:55.530469+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444441", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2023-05-01", "serial_number": null, "funding_source": null, "purchase_price": 850000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"vin": "", "brand": null, "color": "", "model": null, "asset_id": "97832e0a-15cd-4e72-bb77-548028065fe5", "capacity": "", "fuel_type": "", "created_at": "2026-07-28T06:53:49.793435Z", "kir_expiry": null, "tax_expiry": null, "updated_at": "2026-07-28T09:07:55.526478456Z", "bpkb_number": "", "stnk_expiry": null, "transmission": "", "engine_number": "", "license_plate": "", "odometer_last": null, "lapor_tiba_expiry": null, "heavy_equipment_tax_expiry": null}, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 96}	\N	\N	\N	2026-07-28 09:07:55.530469+00	{updated_at,vehicle_details}
9e99c239-ffa1-4ee1-b17f-cd46d9d96b65	assets	ad65e6f6-9b65-42f6-a5bb-a8f442379778	UPDATE	{"id": "ad65e6f6-9b65-42f6-a5bb-a8f442379778", "name": "Wheel Loader WA380", "brand": "Komatsu", "model": "WA380-6", "notes": null, "photos": {}, "status": "maintenance", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 1, "quantity": 1, "is_rental": true, "sale_date": null, "vendor_id": null, "asset_code": "EQP-2024-004", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T06:53:49.793435+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444431", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2023-08-01", "serial_number": null, "funding_source": null, "purchase_price": 1800000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": null, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 120}	{"id": "ad65e6f6-9b65-42f6-a5bb-a8f442379778", "name": "Wheel Loader WA380", "brand": "Komatsu", "model": "WA380-6", "notes": null, "photos": {}, "status": "under_maintenance", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 2, "quantity": 1, "is_rental": true, "sale_date": null, "vendor_id": null, "asset_code": "EQP-2024-004", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T07:19:33.613907+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444431", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2023-08-01", "serial_number": null, "funding_source": null, "purchase_price": 1800000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": null, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 120}	\N	\N	\N	2026-07-28 07:19:33.613907+00	{status,version,updated_at}
21038ccd-81bb-46ec-9114-436dd304bc27	assets	96f1ca37-7132-437e-ac3c-ef0d0bd7aab3	UPDATE	{"id": "96f1ca37-7132-437e-ac3c-ef0d0bd7aab3", "name": "Hino 500 Ranger (DT-01)", "brand": "Hino", "model": "FM 260 JD", "notes": null, "photos": {}, "status": "in_inventory", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 2, "quantity": 1, "is_rental": true, "sale_date": null, "vendor_id": null, "asset_code": "DT-001", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T07:20:35.495874+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444441", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2023-05-01", "serial_number": null, "funding_source": null, "purchase_price": 850000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"color": "Green", "capacity": "20 Ton", "fuel_type": "Diesel", "license_plate": "B 9001 TXT"}, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 96}	{"id": "96f1ca37-7132-437e-ac3c-ef0d0bd7aab3", "name": "Hino 500 Ranger (DT-01)", "brand": "Hino", "model": "FM 260 JD", "notes": null, "photos": {}, "status": "in_inventory", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 2, "quantity": 1, "is_rental": true, "sale_date": null, "vendor_id": null, "asset_code": "DT-001", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T07:20:35.619614+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444441", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2023-05-01", "serial_number": null, "funding_source": null, "purchase_price": 850000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"vin": "", "brand": null, "color": "", "model": null, "asset_id": "96f1ca37-7132-437e-ac3c-ef0d0bd7aab3", "capacity": "", "fuel_type": "", "created_at": "2026-07-28T06:53:49.793435Z", "kir_expiry": null, "tax_expiry": null, "updated_at": "2026-07-28T07:20:35.607684208Z", "bpkb_number": "", "stnk_expiry": null, "transmission": "", "engine_number": "", "license_plate": "", "odometer_last": null, "lapor_tiba_expiry": null, "heavy_equipment_tax_expiry": null}, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 96}	\N	\N	\N	2026-07-28 07:20:35.619614+00	{updated_at,vehicle_details}
97749dd1-31b3-4a8b-a16b-7e69ccc124c6	assets	36772359-e9c7-4d3a-b276-540e24cb3e60	UPDATE	{"id": "36772359-e9c7-4d3a-b276-540e24cb3e60", "name": "Fuso Fighter X (DT-04)", "brand": "Mitsubishi", "model": "FN 62 F HD", "notes": null, "photos": {}, "status": "maintenance", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 1, "quantity": 1, "is_rental": true, "sale_date": null, "vendor_id": null, "asset_code": "DT-004", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T06:53:49.793435+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444441", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2023-07-20", "serial_number": null, "funding_source": null, "purchase_price": 880000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"color": "Orange", "capacity": "22 Ton", "fuel_type": "Diesel", "license_plate": "B 9004 TXT"}, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 96}	{"id": "36772359-e9c7-4d3a-b276-540e24cb3e60", "name": "Fuso Fighter X (DT-04)", "brand": "Mitsubishi", "model": "FN 62 F HD", "notes": null, "photos": {}, "status": "under_maintenance", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 2, "quantity": 1, "is_rental": true, "sale_date": null, "vendor_id": null, "asset_code": "DT-004", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T07:23:04.404224+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444441", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2023-07-20", "serial_number": null, "funding_source": null, "purchase_price": 880000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"color": "Orange", "capacity": "22 Ton", "fuel_type": "Diesel", "license_plate": "B 9004 TXT"}, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 96}	\N	\N	\N	2026-07-28 07:23:04.404224+00	{status,version,updated_at}
020984c3-f2c4-42c6-ae62-8eab631077a7	assets	96f1ca37-7132-437e-ac3c-ef0d0bd7aab3	UPDATE	{"id": "96f1ca37-7132-437e-ac3c-ef0d0bd7aab3", "name": "Hino 500 Ranger (DT-01)", "brand": "Hino", "model": "FM 260 JD", "notes": null, "photos": {}, "status": "available", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 1, "quantity": 1, "is_rental": true, "sale_date": null, "vendor_id": null, "asset_code": "DT-001", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T06:53:49.793435+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444441", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2023-05-01", "serial_number": null, "funding_source": null, "purchase_price": 850000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"color": "Green", "capacity": "20 Ton", "fuel_type": "Diesel", "license_plate": "B 9001 TXT"}, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 96}	{"id": "96f1ca37-7132-437e-ac3c-ef0d0bd7aab3", "name": "Hino 500 Ranger (DT-01)", "brand": "Hino", "model": "FM 260 JD", "notes": null, "photos": {}, "status": "in_inventory", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 2, "quantity": 1, "is_rental": true, "sale_date": null, "vendor_id": null, "asset_code": "DT-001", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T07:20:35.495874+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444441", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2023-05-01", "serial_number": null, "funding_source": null, "purchase_price": 850000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"color": "Green", "capacity": "20 Ton", "fuel_type": "Diesel", "license_plate": "B 9001 TXT"}, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 96}	\N	\N	\N	2026-07-28 07:20:35.495874+00	{status,version,updated_at}
793688fa-641c-4ec8-90cd-90e94d66cd51	assets	36772359-e9c7-4d3a-b276-540e24cb3e60	UPDATE	{"id": "36772359-e9c7-4d3a-b276-540e24cb3e60", "name": "Fuso Fighter X (DT-04)", "brand": "Mitsubishi", "model": "FN 62 F HD", "notes": null, "photos": {}, "status": "under_maintenance", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 2, "quantity": 1, "is_rental": true, "sale_date": null, "vendor_id": null, "asset_code": "DT-004", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T07:23:04.404224+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444441", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2023-07-20", "serial_number": null, "funding_source": null, "purchase_price": 880000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"color": "Orange", "capacity": "22 Ton", "fuel_type": "Diesel", "license_plate": "B 9004 TXT"}, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 96}	{"id": "36772359-e9c7-4d3a-b276-540e24cb3e60", "name": "Fuso Fighter X (DT-04)", "brand": "Mitsubishi", "model": "FN 62 F HD", "notes": null, "photos": {}, "status": "under_maintenance", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 2, "quantity": 1, "is_rental": true, "sale_date": null, "vendor_id": null, "asset_code": "DT-004", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T07:23:04.466876+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444441", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2023-07-20", "serial_number": null, "funding_source": null, "purchase_price": 880000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"vin": "", "brand": null, "color": "", "model": null, "asset_id": "36772359-e9c7-4d3a-b276-540e24cb3e60", "capacity": "", "fuel_type": "", "created_at": "2026-07-28T06:53:49.793435Z", "kir_expiry": null, "tax_expiry": null, "updated_at": "2026-07-28T07:23:04.455045490Z", "bpkb_number": "", "stnk_expiry": null, "transmission": "", "engine_number": "", "license_plate": "", "odometer_last": null, "lapor_tiba_expiry": null, "heavy_equipment_tax_expiry": null}, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 96}	\N	\N	\N	2026-07-28 07:23:04.466876+00	{updated_at,vehicle_details}
736e30f0-8fce-4f77-afaf-ae368bae24ca	assets	66666666-6666-6666-6666-666666666604	UPDATE	{"id": "66666666-6666-6666-6666-666666666604", "name": "Cisco Switch 24 Port", "brand": "Cisco", "model": "Catalyst 9300-24T", "notes": null, "photos": {}, "status": "deployed", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 1, "quantity": 2, "is_rental": false, "sale_date": null, "vendor_id": "55555555-5555-5555-5555-555555555501", "asset_code": "AST-IT-004", "created_at": "2026-07-28T06:53:48.524635+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T06:53:48.524635+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444412", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333321", "qr_code_url": null, "condition_id": 1, "department_id": "22222222-2222-2222-2222-222222222201", "purchase_date": "2023-12-10", "serial_number": "FCW2134ABCD", "funding_source": null, "purchase_price": 45000000.00, "residual_value": 5000000.00, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": null, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 60}	{"id": "66666666-6666-6666-6666-666666666604", "name": "Cisco Switch 24 Port", "brand": "Cisco", "model": "Catalyst 9300-24T", "notes": null, "photos": {}, "status": "deployed", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 2, "quantity": 2, "is_rental": false, "sale_date": null, "vendor_id": "55555555-5555-5555-5555-555555555501", "asset_code": "AST-IT-004", "created_at": "2026-07-28T06:53:48.524635+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T09:01:02.247492+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444412", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333321", "qr_code_url": null, "condition_id": 1, "department_id": "22222222-2222-2222-2222-222222222201", "purchase_date": "2023-12-10", "serial_number": "FCW2134ABCD", "funding_source": null, "purchase_price": 45000000.00, "residual_value": 5000000.00, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": null, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 60}	\N	\N	\N	2026-07-28 09:01:02.247492+00	{version,updated_at}
5b6515ad-8c8a-4f81-a5fe-8f1c1dcc420a	assets	66666666-6666-6666-6666-666666666620	UPDATE	{"id": "66666666-6666-6666-6666-666666666620", "name": "Dell Latitude 5530", "brand": "Dell", "model": "Latitude 5530", "notes": null, "photos": {}, "status": "in_maintenance", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 1, "quantity": 1, "is_rental": false, "sale_date": null, "vendor_id": "55555555-5555-5555-5555-555555555501", "asset_code": "AST-IT-010", "created_at": "2026-07-28T06:53:48.524635+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T06:53:48.524635+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444411", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333322", "qr_code_url": null, "condition_id": 4, "department_id": "22222222-2222-2222-2222-222222222201", "purchase_date": "2022-05-15", "serial_number": "LAT5530XYZ", "funding_source": null, "purchase_price": 18000000.00, "residual_value": 3000000.00, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": null, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 48}	{"id": "66666666-6666-6666-6666-666666666620", "name": "Dell Latitude 5530", "brand": "Dell", "model": "Latitude 5530", "notes": null, "photos": {}, "status": "in_maintenance", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 2, "quantity": 1, "is_rental": false, "sale_date": null, "vendor_id": "55555555-5555-5555-5555-555555555501", "asset_code": "AST-IT-010", "created_at": "2026-07-28T06:53:48.524635+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T09:02:32.099616+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444411", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333322", "qr_code_url": null, "condition_id": 4, "department_id": "22222222-2222-2222-2222-222222222201", "purchase_date": "2022-05-15", "serial_number": "LAT5530XYZ", "funding_source": null, "purchase_price": 18000000.00, "residual_value": 3000000.00, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": null, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 48}	\N	\N	\N	2026-07-28 09:02:32.099616+00	{version,updated_at}
de53cc6e-3b57-4e63-92a3-5f126542536b	assets	ac342b8f-571d-44c6-bcd1-32018899c2c1	UPDATE	{"id": "ac342b8f-571d-44c6-bcd1-32018899c2c1", "name": "Innova Zenix Hybrid (Direksi)", "brand": "Toyota", "model": "Innova Zenix Q", "notes": null, "photos": {}, "status": "deployed", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 2, "quantity": 1, "is_rental": false, "sale_date": null, "vendor_id": null, "asset_code": "OPS-004", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T09:08:46.093448+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444442", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222201", "purchase_date": "2024-01-15", "serial_number": null, "funding_source": null, "purchase_price": 620000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"color": "Black", "capacity": "7 Seater", "fuel_type": "Hybrid", "license_plate": "B 1 RFS"}, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 60}	{"id": "ac342b8f-571d-44c6-bcd1-32018899c2c1", "name": "Innova Zenix Hybrid (Direksi)", "brand": "Toyota", "model": "Innova Zenix Q", "notes": null, "photos": {}, "status": "deployed", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 2, "quantity": 1, "is_rental": false, "sale_date": null, "vendor_id": null, "asset_code": "OPS-004", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T09:08:46.175189+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444442", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222201", "purchase_date": "2024-01-15", "serial_number": null, "funding_source": null, "purchase_price": 620000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"vin": "", "brand": null, "color": "", "model": null, "asset_id": "ac342b8f-571d-44c6-bcd1-32018899c2c1", "capacity": "", "fuel_type": "", "created_at": "2026-07-28T06:53:49.793435Z", "kir_expiry": null, "tax_expiry": null, "updated_at": "2026-07-28T09:08:46.171527975Z", "bpkb_number": "", "stnk_expiry": null, "transmission": "", "engine_number": "", "license_plate": "", "odometer_last": null, "lapor_tiba_expiry": null, "heavy_equipment_tax_expiry": null}, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 60}	\N	\N	\N	2026-07-28 09:08:46.175189+00	{updated_at,vehicle_details}
b51d9a14-e3e1-482e-a3ed-767e92181b06	assets	66666666-6666-6666-6666-666666666603	UPDATE	{"id": "66666666-6666-6666-6666-666666666603", "name": "Dell PowerEdge R750", "brand": "Dell", "model": "PowerEdge R750", "notes": null, "photos": {}, "status": "deployed", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 1, "quantity": 1, "is_rental": false, "sale_date": null, "vendor_id": "55555555-5555-5555-5555-555555555501", "asset_code": "AST-IT-003", "created_at": "2026-07-28T06:53:48.524635+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T06:53:48.524635+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444413", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333321", "qr_code_url": null, "condition_id": 1, "department_id": "22222222-2222-2222-2222-222222222201", "purchase_date": "2024-02-01", "serial_number": "SRV20240001", "funding_source": null, "purchase_price": 150000000.00, "residual_value": 20000000.00, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": null, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 60}	{"id": "66666666-6666-6666-6666-666666666603", "name": "Dell PowerEdge R750", "brand": "Dell", "model": "PowerEdge R750", "notes": null, "photos": {}, "status": "deployed", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 2, "quantity": 1, "is_rental": false, "sale_date": null, "vendor_id": "55555555-5555-5555-5555-555555555501", "asset_code": "AST-IT-003", "created_at": "2026-07-28T06:53:48.524635+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T09:03:56.474965+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444413", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333321", "qr_code_url": null, "condition_id": 1, "department_id": "22222222-2222-2222-2222-222222222201", "purchase_date": "2024-02-01", "serial_number": "SRV20240001", "funding_source": null, "purchase_price": 150000000.00, "residual_value": 20000000.00, "specifications": {"OS": "", "RAM": "", "Processor": "", "Form Factor": "", "Storage (RAID)": ""}, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": null, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 60}	\N	\N	\N	2026-07-28 09:03:56.474965+00	{version,updated_at,specifications}
18d3799b-339f-4c94-a460-aabb4f6b6647	assets	3b6ecb6e-e9dd-49b4-b99e-f158a69c32e8	UPDATE	{"id": "3b6ecb6e-e9dd-49b4-b99e-f158a69c32e8", "name": "Excavator Kobelco SK200", "brand": "Kobelco", "model": "SK200-10", "notes": null, "photos": {}, "status": "rented_out", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 1, "quantity": 1, "is_rental": true, "sale_date": null, "vendor_id": null, "asset_code": "EQP-2024-002", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T06:53:49.793435+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444431", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2023-02-20", "serial_number": null, "funding_source": null, "purchase_price": 1450000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": null, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 120}	{"id": "3b6ecb6e-e9dd-49b4-b99e-f158a69c32e8", "name": "Excavator Kobelco SK200", "brand": "Kobelco", "model": "SK200-10", "notes": null, "photos": {}, "status": "rented_out", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 2, "quantity": 1, "is_rental": true, "sale_date": null, "vendor_id": null, "asset_code": "EQP-2024-002", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T09:04:48.288561+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444431", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2023-02-20", "serial_number": null, "funding_source": null, "purchase_price": 1450000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": null, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 120}	\N	\N	\N	2026-07-28 09:04:48.288561+00	{version,updated_at}
2f704101-babb-4aad-b2ef-baeef7d38b2f	assets	3b241ee4-d374-4217-b303-946da3bf0d00	UPDATE	{"id": "3b241ee4-d374-4217-b303-946da3bf0d00", "name": "Excavator Komatsu PC200-10", "brand": "Komatsu", "model": "PC200-10", "notes": null, "photos": {}, "status": "available", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 1, "quantity": 1, "is_rental": true, "sale_date": null, "vendor_id": null, "asset_code": "EQP-2024-001", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T06:53:49.793435+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444431", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2023-01-15", "serial_number": null, "funding_source": null, "purchase_price": 1500000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": null, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 120}	{"id": "3b241ee4-d374-4217-b303-946da3bf0d00", "name": "Excavator Komatsu PC200-10", "brand": "Komatsu", "model": "PC200-10", "notes": null, "photos": {}, "status": "in_inventory", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 2, "quantity": 1, "is_rental": true, "sale_date": null, "vendor_id": null, "asset_code": "EQP-2024-001", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T09:05:48.057418+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444431", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2023-01-15", "serial_number": null, "funding_source": null, "purchase_price": 1500000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": null, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 120}	\N	\N	\N	2026-07-28 09:05:48.057418+00	{status,version,updated_at}
faea5374-1f00-4d6b-93b2-0349185ce9d6	assets	66666666-6666-6666-6666-666666666605	UPDATE	{"id": "66666666-6666-6666-6666-666666666605", "name": "HP LaserJet Pro", "brand": "HP", "model": "LaserJet Pro M428fdn", "notes": null, "photos": {}, "status": "in_inventory", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 1, "quantity": 1, "is_rental": false, "sale_date": null, "vendor_id": "55555555-5555-5555-5555-555555555501", "asset_code": "AST-IT-005", "created_at": "2026-07-28T06:53:48.524635+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T06:53:48.524635+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444414", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333322", "qr_code_url": null, "condition_id": 2, "department_id": "22222222-2222-2222-2222-222222222201", "purchase_date": "2023-08-15", "serial_number": "VNB3X12345", "funding_source": null, "purchase_price": 8500000.00, "residual_value": 1000000.00, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": null, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 48}	{"id": "66666666-6666-6666-6666-666666666605", "name": "HP LaserJet Pro", "brand": "HP", "model": "LaserJet Pro M428fdn", "notes": null, "photos": {}, "status": "in_inventory", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 2, "quantity": 1, "is_rental": false, "sale_date": null, "vendor_id": "55555555-5555-5555-5555-555555555501", "asset_code": "AST-IT-005", "created_at": "2026-07-28T06:53:48.524635+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T09:07:07.579052+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444414", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333322", "qr_code_url": null, "condition_id": 2, "department_id": "22222222-2222-2222-2222-222222222201", "purchase_date": "2023-08-15", "serial_number": "VNB3X12345", "funding_source": null, "purchase_price": 8500000.00, "residual_value": 1000000.00, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": null, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 48}	\N	\N	\N	2026-07-28 09:07:07.579052+00	{version,updated_at}
f1f97558-1ed0-45ed-b3ec-44e92f7cba30	assets	2a13467e-2e81-4b46-a934-cd1564916ab0	UPDATE	{"id": "2a13467e-2e81-4b46-a934-cd1564916ab0", "name": "Hino 500 Ranger (DT-02)", "brand": "Hino", "model": "FM 260 JD", "notes": null, "photos": {}, "status": "rented_out", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 2, "quantity": 1, "is_rental": true, "sale_date": null, "vendor_id": null, "asset_code": "DT-002", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T09:07:35.993598+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444441", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2023-05-01", "serial_number": null, "funding_source": null, "purchase_price": 850000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"color": "Green", "capacity": "20 Ton", "fuel_type": "Diesel", "license_plate": "B 9002 TXT"}, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 96}	{"id": "2a13467e-2e81-4b46-a934-cd1564916ab0", "name": "Hino 500 Ranger (DT-02)", "brand": "Hino", "model": "FM 260 JD", "notes": null, "photos": {}, "status": "rented_out", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 2, "quantity": 1, "is_rental": true, "sale_date": null, "vendor_id": null, "asset_code": "DT-002", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T09:07:36.030605+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444441", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2023-05-01", "serial_number": null, "funding_source": null, "purchase_price": 850000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"vin": "", "brand": null, "color": "", "model": null, "asset_id": "2a13467e-2e81-4b46-a934-cd1564916ab0", "capacity": "", "fuel_type": "", "created_at": "2026-07-28T06:53:49.793435Z", "kir_expiry": null, "tax_expiry": null, "updated_at": "2026-07-28T09:07:36.016375350Z", "bpkb_number": "", "stnk_expiry": null, "transmission": "", "engine_number": "", "license_plate": "", "odometer_last": null, "lapor_tiba_expiry": null, "heavy_equipment_tax_expiry": null}, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 96}	\N	\N	\N	2026-07-28 09:07:36.030605+00	{updated_at,vehicle_details}
25bf3a8f-0e12-417a-83f5-9db68b853f4c	assets	2a13467e-2e81-4b46-a934-cd1564916ab0	UPDATE	{"id": "2a13467e-2e81-4b46-a934-cd1564916ab0", "name": "Hino 500 Ranger (DT-02)", "brand": "Hino", "model": "FM 260 JD", "notes": null, "photos": {}, "status": "rented_out", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 1, "quantity": 1, "is_rental": true, "sale_date": null, "vendor_id": null, "asset_code": "DT-002", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T06:53:49.793435+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444441", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2023-05-01", "serial_number": null, "funding_source": null, "purchase_price": 850000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"color": "Green", "capacity": "20 Ton", "fuel_type": "Diesel", "license_plate": "B 9002 TXT"}, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 96}	{"id": "2a13467e-2e81-4b46-a934-cd1564916ab0", "name": "Hino 500 Ranger (DT-02)", "brand": "Hino", "model": "FM 260 JD", "notes": null, "photos": {}, "status": "rented_out", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 2, "quantity": 1, "is_rental": true, "sale_date": null, "vendor_id": null, "asset_code": "DT-002", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T09:07:35.993598+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444441", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2023-05-01", "serial_number": null, "funding_source": null, "purchase_price": 850000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"color": "Green", "capacity": "20 Ton", "fuel_type": "Diesel", "license_plate": "B 9002 TXT"}, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 96}	\N	\N	\N	2026-07-28 09:07:35.993598+00	{version,updated_at}
1ee29fbb-1274-4706-991f-946d6239d928	assets	97832e0a-15cd-4e72-bb77-548028065fe5	UPDATE	{"id": "97832e0a-15cd-4e72-bb77-548028065fe5", "name": "Hino 500 Ranger (DT-05)", "brand": "Hino", "model": "FM 260 JD", "notes": null, "photos": {}, "status": "available", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 1, "quantity": 1, "is_rental": true, "sale_date": null, "vendor_id": null, "asset_code": "DT-005", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T06:53:49.793435+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444441", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2023-05-01", "serial_number": null, "funding_source": null, "purchase_price": 850000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"color": "Green", "capacity": "20 Ton", "fuel_type": "Diesel", "license_plate": "B 9005 TXT"}, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 96}	{"id": "97832e0a-15cd-4e72-bb77-548028065fe5", "name": "Hino 500 Ranger (DT-05)", "brand": "Hino", "model": "FM 260 JD", "notes": null, "photos": {}, "status": "in_inventory", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 2, "quantity": 1, "is_rental": true, "sale_date": null, "vendor_id": null, "asset_code": "DT-005", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T09:07:55.482475+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444441", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2023-05-01", "serial_number": null, "funding_source": null, "purchase_price": 850000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"color": "Green", "capacity": "20 Ton", "fuel_type": "Diesel", "license_plate": "B 9005 TXT"}, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 96}	\N	\N	\N	2026-07-28 09:07:55.482475+00	{status,version,updated_at}
3131a9c2-2dde-423e-9ecb-60de0f20a514	assets	ac342b8f-571d-44c6-bcd1-32018899c2c1	UPDATE	{"id": "ac342b8f-571d-44c6-bcd1-32018899c2c1", "name": "Innova Zenix Hybrid (Direksi)", "brand": "Toyota", "model": "Innova Zenix Q", "notes": null, "photos": {}, "status": "in_use", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 1, "quantity": 1, "is_rental": false, "sale_date": null, "vendor_id": null, "asset_code": "OPS-004", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T06:53:49.793435+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444442", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222201", "purchase_date": "2024-01-15", "serial_number": null, "funding_source": null, "purchase_price": 620000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"color": "Black", "capacity": "7 Seater", "fuel_type": "Hybrid", "license_plate": "B 1 RFS"}, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 60}	{"id": "ac342b8f-571d-44c6-bcd1-32018899c2c1", "name": "Innova Zenix Hybrid (Direksi)", "brand": "Toyota", "model": "Innova Zenix Q", "notes": null, "photos": {}, "status": "deployed", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 2, "quantity": 1, "is_rental": false, "sale_date": null, "vendor_id": null, "asset_code": "OPS-004", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T09:08:46.093448+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444442", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222201", "purchase_date": "2024-01-15", "serial_number": null, "funding_source": null, "purchase_price": 620000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"color": "Black", "capacity": "7 Seater", "fuel_type": "Hybrid", "license_plate": "B 1 RFS"}, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 60}	\N	\N	\N	2026-07-28 09:08:46.093448+00	{status,version,updated_at}
80eb8f3a-71eb-4ca4-84f0-fb0e6f0f8fcf	assets	07626bdf-a194-43b9-9f80-2b2bd33c862e	UPDATE	{"id": "07626bdf-a194-43b9-9f80-2b2bd33c862e", "name": "Isuzu Giga FVZ (DT-03)", "brand": "Isuzu", "model": "FVZ 34 N HP", "notes": null, "photos": {}, "status": "available", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 1, "quantity": 1, "is_rental": true, "sale_date": null, "vendor_id": null, "asset_code": "DT-003", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T06:53:49.793435+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444441", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2023-06-15", "serial_number": null, "funding_source": null, "purchase_price": 900000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"color": "White", "capacity": "24 Ton", "fuel_type": "Diesel", "license_plate": "B 9003 TXT"}, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 96}	{"id": "07626bdf-a194-43b9-9f80-2b2bd33c862e", "name": "Isuzu Giga FVZ (DT-03)", "brand": "Isuzu", "model": "FVZ 34 N HP", "notes": null, "photos": {}, "status": "in_inventory", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 2, "quantity": 1, "is_rental": true, "sale_date": null, "vendor_id": null, "asset_code": "DT-003", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T09:10:07.403978+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444441", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2023-06-15", "serial_number": null, "funding_source": null, "purchase_price": 900000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"color": "White", "capacity": "24 Ton", "fuel_type": "Diesel", "license_plate": "B 9003 TXT"}, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 96}	\N	\N	\N	2026-07-28 09:10:07.403978+00	{status,version,updated_at}
93a22812-6314-4902-b1ca-8f5cec31f318	assets	07626bdf-a194-43b9-9f80-2b2bd33c862e	UPDATE	{"id": "07626bdf-a194-43b9-9f80-2b2bd33c862e", "name": "Isuzu Giga FVZ (DT-03)", "brand": "Isuzu", "model": "FVZ 34 N HP", "notes": null, "photos": {}, "status": "in_inventory", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 2, "quantity": 1, "is_rental": true, "sale_date": null, "vendor_id": null, "asset_code": "DT-003", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T09:10:07.403978+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444441", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2023-06-15", "serial_number": null, "funding_source": null, "purchase_price": 900000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"color": "White", "capacity": "24 Ton", "fuel_type": "Diesel", "license_plate": "B 9003 TXT"}, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 96}	{"id": "07626bdf-a194-43b9-9f80-2b2bd33c862e", "name": "Isuzu Giga FVZ (DT-03)", "brand": "Isuzu", "model": "FVZ 34 N HP", "notes": null, "photos": {}, "status": "in_inventory", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 2, "quantity": 1, "is_rental": true, "sale_date": null, "vendor_id": null, "asset_code": "DT-003", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T09:10:07.445612+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444441", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2023-06-15", "serial_number": null, "funding_source": null, "purchase_price": 900000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"vin": "", "brand": null, "color": "", "model": null, "asset_id": "07626bdf-a194-43b9-9f80-2b2bd33c862e", "capacity": "", "fuel_type": "", "created_at": "2026-07-28T06:53:49.793435Z", "kir_expiry": null, "tax_expiry": null, "updated_at": "2026-07-28T09:10:07.442306533Z", "bpkb_number": "", "stnk_expiry": null, "transmission": "", "engine_number": "", "license_plate": "", "odometer_last": null, "lapor_tiba_expiry": null, "heavy_equipment_tax_expiry": null}, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 96}	\N	\N	\N	2026-07-28 09:10:07.445612+00	{updated_at,vehicle_details}
aafddaa5-0821-43f4-a0c4-15735033b24d	assets	66666666-6666-6666-6666-666666666621	UPDATE	{"id": "66666666-6666-6666-6666-666666666621", "name": "Proyektor Epson", "brand": "Epson", "model": "EB-X51", "notes": null, "photos": {}, "status": "in_inventory", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 1, "quantity": 1, "is_rental": false, "sale_date": null, "vendor_id": "55555555-5555-5555-5555-555555555501", "asset_code": "AST-IT-011", "created_at": "2026-07-28T06:53:48.524635+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T06:53:48.524635+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444401", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333323", "qr_code_url": null, "condition_id": 2, "department_id": "22222222-2222-2222-2222-222222222201", "purchase_date": "2023-04-20", "serial_number": "EPX51ABC123", "funding_source": null, "purchase_price": 12000000.00, "residual_value": 1500000.00, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": null, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 48}	{"id": "66666666-6666-6666-6666-666666666621", "name": "Proyektor Epson", "brand": "Epson", "model": "EB-X51", "notes": null, "photos": {}, "status": "in_inventory", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 2, "quantity": 1, "is_rental": false, "sale_date": null, "vendor_id": "55555555-5555-5555-5555-555555555501", "asset_code": "AST-IT-011", "created_at": "2026-07-28T06:53:48.524635+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T09:17:03.008633+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444401", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333323", "qr_code_url": null, "condition_id": 2, "department_id": "22222222-2222-2222-2222-222222222201", "purchase_date": "2023-04-20", "serial_number": "EPX51ABC123", "funding_source": null, "purchase_price": 12000000.00, "residual_value": 1500000.00, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": null, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 48}	\N	\N	\N	2026-07-28 09:17:03.008633+00	{version,updated_at}
8cb64b00-a390-4832-a3a7-b471df3666bb	assets	66666666-6666-6666-6666-666666666612	UPDATE	{"id": "66666666-6666-6666-6666-666666666612", "name": "Kursi Ergonomis", "brand": "Herman Miller", "model": "Aeron Chair", "notes": null, "photos": {}, "status": "in_inventory", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 1, "quantity": 5, "is_rental": false, "sale_date": null, "vendor_id": "55555555-5555-5555-5555-555555555502", "asset_code": "AST-FRN-002", "created_at": "2026-07-28T06:53:48.524635+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T06:53:48.524635+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444422", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333322", "qr_code_url": null, "condition_id": 1, "department_id": "22222222-2222-2222-2222-222222222201", "purchase_date": "2024-01-10", "serial_number": null, "funding_source": null, "purchase_price": 18000000.00, "residual_value": 2000000.00, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": null, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 96}	{"id": "66666666-6666-6666-6666-666666666612", "name": "Kursi Ergonomis", "brand": "Herman Miller", "model": "Aeron Chair", "notes": null, "photos": {}, "status": "in_inventory", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 2, "quantity": 5, "is_rental": false, "sale_date": null, "vendor_id": "55555555-5555-5555-5555-555555555502", "asset_code": "AST-FRN-002", "created_at": "2026-07-28T06:53:48.524635+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T09:11:56.733128+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444422", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333322", "qr_code_url": null, "condition_id": 1, "department_id": "22222222-2222-2222-2222-222222222201", "purchase_date": "2024-01-10", "serial_number": null, "funding_source": null, "purchase_price": 18000000.00, "residual_value": 2000000.00, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": null, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 96}	\N	\N	\N	2026-07-28 09:11:56.733128+00	{version,updated_at}
7f53cdda-c612-4384-a425-bccbbfad9e8c	assets	66666666-6666-6666-6666-666666666630	UPDATE	{"id": "66666666-6666-6666-6666-666666666630", "name": "Old Desktop PC", "brand": "HP", "model": "ProDesk 400 G5", "notes": null, "photos": {}, "status": "retired", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 1, "quantity": 1, "is_rental": false, "sale_date": null, "vendor_id": "55555555-5555-5555-5555-555555555501", "asset_code": "AST-IT-020", "created_at": "2026-07-28T06:53:48.524635+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T06:53:48.524635+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444411", "currency_id": 1, "description": null, "is_rentable": false, "location_id": null, "qr_code_url": null, "condition_id": 5, "department_id": "22222222-2222-2222-2222-222222222201", "purchase_date": "2018-06-01", "serial_number": "HPD4005XYZ", "funding_source": null, "purchase_price": 8000000.00, "residual_value": 0.00, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": null, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 48}	{"id": "66666666-6666-6666-6666-666666666630", "name": "Old Desktop PC", "brand": "HP", "model": "ProDesk 400 G5", "notes": null, "photos": {}, "status": "retired", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 2, "quantity": 1, "is_rental": false, "sale_date": null, "vendor_id": "55555555-5555-5555-5555-555555555501", "asset_code": "AST-IT-020", "created_at": "2026-07-28T06:53:48.524635+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T09:15:35.126242+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444411", "currency_id": 1, "description": null, "is_rentable": false, "location_id": null, "qr_code_url": null, "condition_id": 5, "department_id": "22222222-2222-2222-2222-222222222201", "purchase_date": "2018-06-01", "serial_number": "HPD4005XYZ", "funding_source": null, "purchase_price": 8000000.00, "residual_value": 0.00, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": null, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 48}	\N	\N	\N	2026-07-28 09:15:35.126242+00	{version,updated_at}
23d7aefa-8dd5-4951-978f-6cc259c06df1	assets	66666666-6666-6666-6666-666666666602	UPDATE	{"id": "66666666-6666-6666-6666-666666666602", "name": "ThinkPad X1 Carbon", "brand": "Lenovo", "model": "ThinkPad X1 Carbon Gen 11", "notes": null, "photos": {}, "status": "in_inventory", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 1, "quantity": 1, "is_rental": false, "sale_date": null, "vendor_id": "55555555-5555-5555-5555-555555555501", "asset_code": "AST-IT-002", "created_at": "2026-07-28T06:53:48.524635+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T06:53:48.524635+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444411", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333322", "qr_code_url": null, "condition_id": 2, "department_id": "22222222-2222-2222-2222-222222222201", "purchase_date": "2023-06-20", "serial_number": "PF3ABCD1234", "funding_source": null, "purchase_price": 25000000.00, "residual_value": 4000000.00, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": null, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 48}	{"id": "66666666-6666-6666-6666-666666666602", "name": "ThinkPad X1 Carbon", "brand": "Lenovo", "model": "ThinkPad X1 Carbon Gen 11", "notes": null, "photos": {}, "status": "in_inventory", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 2, "quantity": 1, "is_rental": false, "sale_date": null, "vendor_id": "55555555-5555-5555-5555-555555555501", "asset_code": "AST-IT-002", "created_at": "2026-07-28T06:53:48.524635+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T09:18:08.723289+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444411", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333322", "qr_code_url": null, "condition_id": 2, "department_id": "22222222-2222-2222-2222-222222222201", "purchase_date": "2023-06-20", "serial_number": "PF3ABCD1234", "funding_source": null, "purchase_price": 25000000.00, "residual_value": 4000000.00, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": null, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 48}	\N	\N	\N	2026-07-28 09:18:08.723289+00	{version,updated_at}
59651e7f-2ac4-4a73-bc3f-50cd9e835ffb	assets	8120a96c-bbbd-4a13-9bd7-ed9388118ff6	UPDATE	{"id": "8120a96c-bbbd-4a13-9bd7-ed9388118ff6", "name": "Toyota Avanza Veloz (Pool)", "brand": "Toyota", "model": "Avanza Veloz", "notes": null, "photos": {}, "status": "in_use", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 1, "quantity": 1, "is_rental": false, "sale_date": null, "vendor_id": null, "asset_code": "OPS-003", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T06:53:49.823749+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444442", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222202", "purchase_date": "2023-11-20", "serial_number": null, "funding_source": null, "purchase_price": 280000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"color": "Black", "capacity": "7 Seater", "fuel_type": "Petrol", "license_plate": "B 1236 ABC"}, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 60}	{"id": "8120a96c-bbbd-4a13-9bd7-ed9388118ff6", "name": "Toyota Avanza Veloz (Pool)", "brand": "Toyota", "model": "Avanza Veloz", "notes": null, "photos": {}, "status": "deployed", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 2, "quantity": 1, "is_rental": false, "sale_date": null, "vendor_id": null, "asset_code": "OPS-003", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T09:19:10.123896+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444442", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222202", "purchase_date": "2023-11-20", "serial_number": null, "funding_source": null, "purchase_price": 280000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"color": "Black", "capacity": "7 Seater", "fuel_type": "Petrol", "license_plate": "B 1236 ABC"}, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 60}	\N	\N	\N	2026-07-28 09:19:10.123896+00	{status,version,updated_at}
a2a0787c-16ea-4b4e-a783-36431a44d537	assets	8120a96c-bbbd-4a13-9bd7-ed9388118ff6	UPDATE	{"id": "8120a96c-bbbd-4a13-9bd7-ed9388118ff6", "name": "Toyota Avanza Veloz (Pool)", "brand": "Toyota", "model": "Avanza Veloz", "notes": null, "photos": {}, "status": "deployed", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 2, "quantity": 1, "is_rental": false, "sale_date": null, "vendor_id": null, "asset_code": "OPS-003", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T09:19:10.123896+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444442", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222202", "purchase_date": "2023-11-20", "serial_number": null, "funding_source": null, "purchase_price": 280000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"color": "Black", "capacity": "7 Seater", "fuel_type": "Petrol", "license_plate": "B 1236 ABC"}, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 60}	{"id": "8120a96c-bbbd-4a13-9bd7-ed9388118ff6", "name": "Toyota Avanza Veloz (Pool)", "brand": "Toyota", "model": "Avanza Veloz", "notes": null, "photos": {}, "status": "deployed", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 2, "quantity": 1, "is_rental": false, "sale_date": null, "vendor_id": null, "asset_code": "OPS-003", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T09:19:10.278644+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444442", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222202", "purchase_date": "2023-11-20", "serial_number": null, "funding_source": null, "purchase_price": 280000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"vin": "", "brand": null, "color": "", "model": null, "asset_id": "8120a96c-bbbd-4a13-9bd7-ed9388118ff6", "capacity": "", "fuel_type": "", "created_at": "2026-07-28T06:53:49.793435Z", "kir_expiry": null, "tax_expiry": null, "updated_at": "2026-07-28T09:19:10.263006880Z", "bpkb_number": "", "stnk_expiry": null, "transmission": "", "engine_number": "", "license_plate": "", "odometer_last": null, "lapor_tiba_expiry": null, "heavy_equipment_tax_expiry": null}, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 60}	\N	\N	\N	2026-07-28 09:19:10.278644+00	{updated_at,vehicle_details}
697014ca-a3a8-4ec5-b04c-fa26c366591a	assets	867be6ac-a95c-43c7-b4aa-42fd7e395e29	UPDATE	{"id": "867be6ac-a95c-43c7-b4aa-42fd7e395e29", "name": "Toyota Hilux DC 4x4", "brand": "Toyota", "model": "Hilux Double Cabin", "notes": null, "photos": {}, "status": "deployed", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 2, "quantity": 1, "is_rental": false, "sale_date": null, "vendor_id": null, "asset_code": "OPS-001", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T09:20:23.417711+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444442", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2024-01-05", "serial_number": null, "funding_source": null, "purchase_price": 550000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"color": "White", "capacity": "5 Seater", "fuel_type": "Diesel", "license_plate": "B 1234 ABC"}, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 60}	{"id": "867be6ac-a95c-43c7-b4aa-42fd7e395e29", "name": "Toyota Hilux DC 4x4", "brand": "Toyota", "model": "Hilux Double Cabin", "notes": null, "photos": {}, "status": "deployed", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 2, "quantity": 1, "is_rental": false, "sale_date": null, "vendor_id": null, "asset_code": "OPS-001", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T09:20:23.477667+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444442", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2024-01-05", "serial_number": null, "funding_source": null, "purchase_price": 550000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"vin": "", "brand": null, "color": "", "model": null, "asset_id": "867be6ac-a95c-43c7-b4aa-42fd7e395e29", "capacity": "", "fuel_type": "", "created_at": "2026-07-28T06:53:49.793435Z", "kir_expiry": null, "tax_expiry": null, "updated_at": "2026-07-28T09:20:23.473138973Z", "bpkb_number": "", "stnk_expiry": null, "transmission": "", "engine_number": "", "license_plate": "", "odometer_last": null, "lapor_tiba_expiry": null, "heavy_equipment_tax_expiry": null}, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 60}	\N	\N	\N	2026-07-28 09:20:23.477667+00	{updated_at,vehicle_details}
ec062c7b-ce09-4f3b-baf7-fa05fc9952b9	assets	867be6ac-a95c-43c7-b4aa-42fd7e395e29	UPDATE	{"id": "867be6ac-a95c-43c7-b4aa-42fd7e395e29", "name": "Toyota Hilux DC 4x4", "brand": "Toyota", "model": "Hilux Double Cabin", "notes": null, "photos": {}, "status": "in_use", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 1, "quantity": 1, "is_rental": false, "sale_date": null, "vendor_id": null, "asset_code": "OPS-001", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T06:53:49.793435+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444442", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2024-01-05", "serial_number": null, "funding_source": null, "purchase_price": 550000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"color": "White", "capacity": "5 Seater", "fuel_type": "Diesel", "license_plate": "B 1234 ABC"}, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 60}	{"id": "867be6ac-a95c-43c7-b4aa-42fd7e395e29", "name": "Toyota Hilux DC 4x4", "brand": "Toyota", "model": "Hilux Double Cabin", "notes": null, "photos": {}, "status": "deployed", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 2, "quantity": 1, "is_rental": false, "sale_date": null, "vendor_id": null, "asset_code": "OPS-001", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T09:20:23.417711+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444442", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2024-01-05", "serial_number": null, "funding_source": null, "purchase_price": 550000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"color": "White", "capacity": "5 Seater", "fuel_type": "Diesel", "license_plate": "B 1234 ABC"}, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 60}	\N	\N	\N	2026-07-28 09:20:23.417711+00	{status,version,updated_at}
5ba3dbc6-c967-4718-95ce-412e082589e8	assets	66666666-6666-6666-6666-666666666601	UPDATE	{"id": "66666666-6666-6666-6666-666666666601", "name": "MacBook Pro 16\\" M3", "brand": "Apple", "model": "MacBook Pro 16\\"", "notes": null, "photos": {}, "status": "in_inventory", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 1, "quantity": 1, "is_rental": false, "sale_date": null, "vendor_id": "55555555-5555-5555-5555-555555555501", "asset_code": "AST-IT-001", "created_at": "2026-07-28T06:53:48.524635+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T06:53:48.524635+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444411", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333322", "qr_code_url": null, "condition_id": 1, "department_id": "22222222-2222-2222-2222-222222222201", "purchase_date": "2024-01-15", "serial_number": "C02YX1234567", "funding_source": null, "purchase_price": 35000000.00, "residual_value": 5000000.00, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": null, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 48}	{"id": "66666666-6666-6666-6666-666666666601", "name": "MacBook Pro 16\\" M3", "brand": "Apple", "model": "MacBook Pro 16\\"", "notes": null, "photos": {}, "status": "in_inventory", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 2, "quantity": 1, "is_rental": false, "sale_date": null, "vendor_id": "55555555-5555-5555-5555-555555555501", "asset_code": "AST-IT-001", "created_at": "2026-07-28T06:53:48.524635+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T09:24:42.661093+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444411", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333322", "qr_code_url": null, "condition_id": 1, "department_id": "22222222-2222-2222-2222-222222222201", "purchase_date": "2024-01-15", "serial_number": "C02YX1234567", "funding_source": null, "purchase_price": 35000000.00, "residual_value": 5000000.00, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": null, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 48}	\N	\N	\N	2026-07-28 09:24:42.661093+00	{version,updated_at}
fd777fb0-61ad-4d8f-8ae3-38f576a7a132	assets	66666666-6666-6666-6666-666666666611	UPDATE	{"id": "66666666-6666-6666-6666-666666666611", "name": "Meja Kerja Executive", "brand": "Informa", "model": "Executive Desk 180", "notes": null, "photos": {}, "status": "deployed", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 1, "quantity": 1, "is_rental": false, "sale_date": null, "vendor_id": "55555555-5555-5555-5555-555555555502", "asset_code": "AST-FRN-001", "created_at": "2026-07-28T06:53:48.524635+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T06:53:48.524635+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444421", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333324", "qr_code_url": null, "condition_id": 1, "department_id": "22222222-2222-2222-2222-222222222202", "purchase_date": "2023-03-01", "serial_number": null, "funding_source": null, "purchase_price": 5500000.00, "residual_value": 500000.00, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": null, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 96}	{"id": "66666666-6666-6666-6666-666666666611", "name": "Meja Kerja Executive", "brand": "Informa", "model": "Executive Desk 180", "notes": null, "photos": {}, "status": "deployed", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 2, "quantity": 1, "is_rental": false, "sale_date": null, "vendor_id": "55555555-5555-5555-5555-555555555502", "asset_code": "AST-FRN-001", "created_at": "2026-07-28T06:53:48.524635+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T09:30:16.154126+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444421", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333324", "qr_code_url": null, "condition_id": 1, "department_id": "22222222-2222-2222-2222-222222222202", "purchase_date": "2023-03-01", "serial_number": null, "funding_source": null, "purchase_price": 5500000.00, "residual_value": 500000.00, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": null, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 96}	\N	\N	\N	2026-07-28 09:30:16.154126+00	{version,updated_at}
f4d934d9-a42a-4679-a1be-7b393937ce38	assets	bbbcd1cf-d71f-4510-8296-daa2c9542aeb	UPDATE	{"id": "bbbcd1cf-d71f-4510-8296-daa2c9542aeb", "name": "Mitsubishi Triton DC", "brand": "Mitsubishi", "model": "Triton GLS", "notes": null, "photos": {}, "status": "available", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 1, "quantity": 1, "is_rental": false, "sale_date": null, "vendor_id": null, "asset_code": "OPS-002", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T06:53:49.793435+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444442", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2024-02-10", "serial_number": null, "funding_source": null, "purchase_price": 530000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"color": "Silver", "capacity": "5 Seater", "fuel_type": "Diesel", "license_plate": "B 1235 ABC"}, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 60}	{"id": "bbbcd1cf-d71f-4510-8296-daa2c9542aeb", "name": "Mitsubishi Triton DC", "brand": "Mitsubishi", "model": "Triton GLS", "notes": null, "photos": {}, "status": "in_inventory", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 2, "quantity": 1, "is_rental": false, "sale_date": null, "vendor_id": null, "asset_code": "OPS-002", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T09:31:48.731624+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444442", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2024-02-10", "serial_number": null, "funding_source": null, "purchase_price": 530000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"color": "Silver", "capacity": "5 Seater", "fuel_type": "Diesel", "license_plate": "B 1235 ABC"}, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 60}	\N	\N	\N	2026-07-28 09:31:48.731624+00	{status,version,updated_at}
88666895-88ac-4ee6-8a70-92c410372640	assets	bbbcd1cf-d71f-4510-8296-daa2c9542aeb	UPDATE	{"id": "bbbcd1cf-d71f-4510-8296-daa2c9542aeb", "name": "Mitsubishi Triton DC", "brand": "Mitsubishi", "model": "Triton GLS", "notes": null, "photos": {}, "status": "in_inventory", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 2, "quantity": 1, "is_rental": false, "sale_date": null, "vendor_id": null, "asset_code": "OPS-002", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T09:31:48.731624+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444442", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2024-02-10", "serial_number": null, "funding_source": null, "purchase_price": 530000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"color": "Silver", "capacity": "5 Seater", "fuel_type": "Diesel", "license_plate": "B 1235 ABC"}, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 60}	{"id": "bbbcd1cf-d71f-4510-8296-daa2c9542aeb", "name": "Mitsubishi Triton DC", "brand": "Mitsubishi", "model": "Triton GLS", "notes": null, "photos": {}, "status": "in_inventory", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 2, "quantity": 1, "is_rental": false, "sale_date": null, "vendor_id": null, "asset_code": "OPS-002", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T09:31:48.867746+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444442", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2024-02-10", "serial_number": null, "funding_source": null, "purchase_price": 530000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": {"vin": "", "brand": null, "color": "", "model": null, "asset_id": "bbbcd1cf-d71f-4510-8296-daa2c9542aeb", "capacity": "", "fuel_type": "", "created_at": "2026-07-28T06:53:49.793435Z", "kir_expiry": null, "tax_expiry": null, "updated_at": "2026-07-28T09:31:48.851215925Z", "bpkb_number": "", "stnk_expiry": null, "transmission": "", "engine_number": "", "license_plate": "", "odometer_last": null, "lapor_tiba_expiry": null, "heavy_equipment_tax_expiry": null}, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 60}	\N	\N	\N	2026-07-28 09:31:48.867746+00	{updated_at,vehicle_details}
1e22419d-3de5-4fa9-abc7-fb476281600a	assets	26e7d22c-9594-432b-b858-545b6a48982f	UPDATE	{"id": "26e7d22c-9594-432b-b858-545b6a48982f", "name": "Motor Grader GD535", "brand": "Komatsu", "model": "GD535-5", "notes": null, "photos": {}, "status": "available", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 1, "quantity": 1, "is_rental": true, "sale_date": null, "vendor_id": null, "asset_code": "EQP-2024-005", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T06:53:49.793435+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444431", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2023-11-15", "serial_number": null, "funding_source": null, "purchase_price": 1900000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": null, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 120}	{"id": "26e7d22c-9594-432b-b858-545b6a48982f", "name": "Motor Grader GD535", "brand": "Komatsu", "model": "GD535-5", "notes": null, "photos": {}, "status": "in_inventory", "is_fuel": false, "is_loan": false, "sold_to": null, "unit_id": 1, "version": 2, "quantity": 1, "is_rental": true, "sale_date": null, "vendor_id": null, "asset_code": "EQP-2024-005", "created_at": "2026-07-28T06:53:49.793435+00:00", "department": null, "sale_price": null, "updated_at": "2026-07-28T09:32:56.168422+00:00", "asset_class": null, "assigned_to": null, "category_id": "44444444-4444-4444-4444-444444444431", "currency_id": 1, "description": null, "is_rentable": false, "location_id": "33333333-3333-3333-3333-333333333301", "qr_code_url": null, "condition_id": null, "department_id": "22222222-2222-2222-2222-222222222204", "purchase_date": "2023-11-15", "serial_number": null, "funding_source": null, "purchase_price": 1900000000.00, "residual_value": null, "specifications": null, "organization_id": "11111111-1111-1111-1111-111111111111", "vehicle_details": null, "year_manufacture": null, "acquisition_method": null, "useful_life_months": 120}	\N	\N	\N	2026-07-28 09:32:56.168422+00	{status,version,updated_at}
\.


--
-- Data for Name: audit_records; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_records (id, session_id, asset_id, status, notes, scanned_at) FROM stdin;
\.


--
-- Data for Name: audit_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_sessions (id, user_id, status, notes, created_at, closed_at) FROM stdin;
\.


--
-- Data for Name: bins; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bins (id, company_id, warehouse_id, item_id, actual_qty, reserved_qty, ordered_qty, stock_value, updated_at) FROM stdin;
\.


--
-- Data for Name: bom_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bom_items (id, bom_id, item_id, qty_required, scrap_percentage) FROM stdin;
\.


--
-- Data for Name: boms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.boms (id, company_id, item_id, bom_number, version, quantity, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: building_details; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.building_details (asset_id, land_asset_id, building_area, floor_count, build_year, renovation_year, construction_type, building_function, capacity, imb_number, slf_number, slf_expiry, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: cash_bank_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cash_bank_transactions (id, transaction_number, transaction_type, date, amount, from_account_id, to_account_id, account_id, contact_name, description, status, journal_entry_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (id, parent_id, code, name, description, attributes, created_at, updated_at, depreciation_method, depreciation_period_months, residual_rate, main_category, sub_category_letter, example_assets, function_description, display_order, department, asset_account_id, expense_account_id, accumulated_depreciation_account_id, asset_group, capital_wip_account_id, gain_loss_disposal_account_id) FROM stdin;
44444444-4444-4444-4444-444444444412	44444444-4444-4444-4444-444444444401	NETWORK	Perangkat Jaringan	\N	\N	2026-07-28 06:53:48.524635+00	2026-07-28 06:53:48.524635+00	straight_line	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	\N	\N	\N	\N
44444444-4444-4444-4444-444444444414	44444444-4444-4444-4444-444444444401	PRINTER	Printer & Scanner	\N	\N	2026-07-28 06:53:48.524635+00	2026-07-28 06:53:48.524635+00	straight_line	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	\N	\N	\N	\N
44444444-4444-4444-4444-444444444415	44444444-4444-4444-4444-444444444401	MONITOR	Monitor	\N	\N	2026-07-28 06:53:48.524635+00	2026-07-28 06:53:48.524635+00	straight_line	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	\N	\N	\N	\N
44444444-4444-4444-4444-444444444421	44444444-4444-4444-4444-444444444402	DESK	Meja	\N	\N	2026-07-28 06:53:48.524635+00	2026-07-28 06:53:48.524635+00	straight_line	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	\N	\N	\N	\N
44444444-4444-4444-4444-444444444422	44444444-4444-4444-4444-444444444402	CHAIR	Kursi	\N	\N	2026-07-28 06:53:48.524635+00	2026-07-28 06:53:48.524635+00	straight_line	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	\N	\N	\N	\N
44444444-4444-4444-4444-444444444423	44444444-4444-4444-4444-444444444402	CABINET	Lemari	\N	\N	2026-07-28 06:53:48.524635+00	2026-07-28 06:53:48.524635+00	straight_line	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	\N	\N	\N	\N
c0000001-0000-0000-0000-000000000001	\N	ASET-INTI	Aset Inti (Rental)	Aset yang menghasilkan pendapatan langsung dari sewa	\N	2026-07-28 06:53:48.611895+00	2026-07-28 06:53:48.611895+00	straight_line	\N	\N	ASET INTI (RENTAL)	\N	\N	Aset Produktif Utama. Menghasilkan pendapatan langsung dari sewa. Nilai tinggi, usia ekonomis panjang.	1	\N	\N	\N	\N	\N	\N	\N
c0000002-0000-0000-0000-000000000002	\N	ASET-OPS	Aset Operasional	Aset untuk mendukung aktivitas perusahaan	\N	2026-07-28 06:53:48.611895+00	2026-07-28 06:53:48.611895+00	straight_line	\N	\N	ASET OPERASIONAL	\N	\N	Untuk Mendukung Aktivitas Perusahaan. Tidak untuk disewa, tetapi untuk transportasi internal, servis, dan logistik.	2	\N	\N	\N	\N	\N	\N	\N
c0000003-0001-0000-0000-000000000001	c0000003-0000-0000-0000-000000000003	INFRA-TANAH	Tanah	Tanah milik perusahaan	\N	2026-07-28 06:53:48.611895+00	2026-07-28 06:53:48.611895+00	straight_line	\N	\N	ASET TETAP INFRASTRUKTUR	A	["Tanah Lokasi Kantor", "Tanah Lapangan Penyimpanan (Yard)", "Tanah untuk Bengkel"]	Akomodasi Lokasi Usaha. Bisa sebagai tempat operasional atau investasi jangka panjang.	31	\N	\N	\N	\N	\N	\N	\N
4ff4cf44-89df-4e67-8cf7-e891258b9add	c0000001-0001-0000-0000-000000000001	HE-LOADER	Wheel Loader	\N	["Bucket Capacity (m3)", "Payload (kg)", "Engine Power (HP)", "Dumping Clearance"]	2026-07-28 06:53:49.556892+00	2026-07-28 06:53:49.556892+00	straight_line	\N	\N	ASET INTI (RENTAL)	\N	\N	\N	0	LOGISTIC	\N	\N	\N	\N	\N	\N
171f556c-e955-4bc7-ae6e-d811b8cb171f	c0000001-0001-0000-0000-000000000001	HE-GRADER	Motor Grader	\N	["Blade Width", "Operating Weight", "Engine Power"]	2026-07-28 06:53:49.556892+00	2026-07-28 06:53:49.556892+00	straight_line	\N	\N	ASET INTI (RENTAL)	\N	\N	\N	0	LOGISTIC	\N	\N	\N	\N	\N	\N
9e0ad2bd-c590-4c3d-b585-870da1e9a327	c0000001-0001-0000-0000-000000000001	HE-COMPACTOR	Compactor / Vibro	\N	["Drum Width", "Operating Weight", "Vibration Frequency"]	2026-07-28 06:53:49.556892+00	2026-07-28 06:53:49.556892+00	straight_line	\N	\N	ASET INTI (RENTAL)	\N	\N	\N	0	LOGISTIC	\N	\N	\N	\N	\N	\N
a4cacb0a-0c8e-4869-a17d-491dce45f390	c0000001-0001-0000-0000-000000000001	HE-CRUSHER	Crusher / Pemecah Batu	\N	["Capacity (Ton/Hr)", "Power (KW)", "Input Size (mm)", "Output Size (mm)", "CSS Range"]	2026-07-28 06:53:49.556892+00	2026-07-28 06:53:49.556892+00	straight_line	\N	\N	ASET INTI (RENTAL)	\N	\N	\N	0	LOGISTIC	\N	\N	\N	\N	\N	\N
44444444-4444-4444-4444-444444444411	44444444-4444-4444-4444-444444444401	COMPUTER	Komputer & Laptop	\N	["Processor", "RAM", "Storage", "Screen Size", "OS"]	2026-07-28 06:53:48.524635+00	2026-07-28 06:53:49.556892+00	straight_line	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	\N	\N	\N	\N
44444444-4444-4444-4444-444444444413	44444444-4444-4444-4444-444444444401	SERVER	Server	\N	["Processor", "RAM", "Storage (RAID)", "Form Factor", "OS"]	2026-07-28 06:53:48.524635+00	2026-07-28 06:53:49.556892+00	straight_line	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	\N	\N	\N	\N
1f023d9b-72de-47d8-9f02-1656e2c19143	44444444-4444-4444-4444-444444444404	PM-GENSET	Generator Set (Genset)	\N	["KVA Prime", "KVA Standby", "Fuel Consumption (L/h)", "Phase", "Voltage"]	2026-07-28 06:53:49.556892+00	2026-07-28 06:53:49.556892+00	straight_line	\N	\N	ASET OPERASIONAL	\N	\N	\N	0	ENGINEERING	\N	\N	\N	\N	\N	\N
e19e317e-c684-4751-9474-c76ae20ef88d	c0000001-0001-0000-0000-000000000001	HE-EXCAVATOR	Excavator	\N	["Bucket Capacity (m3)", "Operating Weight (kg)", "Engine Power (HP)", "Max Digging Depth"]	2026-07-28 06:53:49.556892+00	2026-07-28 06:53:50.62434+00	straight_line	\N	\N	ASET INTI (RENTAL)	\N	\N	\N	0	LOGISTIC	\N	\N	\N	ALAT_BERAT	\N	\N
42019e9c-8740-4913-801a-a4d2f3c36e95	c0000001-0001-0000-0000-000000000001	HE-DOZER	Bulldozer	\N	["Blade Capacity (m3)", "Operating Weight (kg)", "Engine Power (HP)", "Blade Type"]	2026-07-28 06:53:49.556892+00	2026-07-28 06:53:50.62434+00	straight_line	\N	\N	ASET INTI (RENTAL)	\N	\N	\N	0	LOGISTIC	\N	\N	\N	ALAT_BERAT	\N	\N
44444444-4444-4444-4444-444444444403	\N	VEHICLE	Kendaraan	\N	\N	2026-07-28 06:53:48.524635+00	2026-07-28 06:53:50.62434+00	straight_line	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	\N	KENDARAAN	\N	\N
8dbeecea-e73b-4995-85b5-71ca7d225353	44444444-4444-4444-4444-444444444404	PM-COMPRESSOR	Air Compressor	\N	["Capacity (CFM)", "Pressure (Bar)", "Power (KW)"]	2026-07-28 06:53:49.556892+00	2026-07-28 06:53:49.556892+00	straight_line	\N	\N	ASET OPERASIONAL	\N	\N	\N	0	ENGINEERING	\N	\N	\N	\N	\N	\N
c0000001-0001-0000-0000-000000000001	c0000001-0000-0000-0000-000000000001	INTI-ALAT-BERAT	Alat Berat (Heavy Equipment)	Alat berat untuk konstruksi dan pertambangan	\N	2026-07-28 06:53:48.611895+00	2026-07-28 06:53:50.62434+00	straight_line	\N	\N	ASET INTI (RENTAL)	A	["Excavator / Backhoe", "Bulldozer", "Wheel Loader", "Motor Grader", "Crane", "Vibratory Roller"]	Aset Produktif Utama. Menghasilkan pendapatan langsung dari sewa. Nilai tinggi, usia ekonomis panjang.	11	\N	00000000-0000-4001-a230-000000000000	\N	\N	ALAT_BERAT	\N	\N
44444444-4444-4444-4444-444444444431	44444444-4444-4444-4444-444444444404	HEAVY-EQUIP	Alat Berat	\N	\N	2026-07-28 06:53:49.793435+00	2026-07-28 06:53:50.62434+00	straight_line	\N	\N	\N	\N	\N	\N	0	\N	00000000-0000-4001-a230-000000000000	\N	\N	ALAT_BERAT	\N	\N
c0000001-0002-0000-0000-000000000001	c0000001-0000-0000-0000-000000000001	INTI-TRUK	Truk Angkutan (Dump Truck)	Truk untuk pengangkutan material	\N	2026-07-28 06:53:48.611895+00	2026-07-28 06:53:50.62434+00	straight_line	\N	\N	ASET INTI (RENTAL)	B	["Dump Truck (HD/Biasa)", "Trailer / Lowbed", "Mixer Truck (Beton Molen)"]	Aset Produktif untuk Pengangkutan. Untuk proyek konstruksi, pertambangan, logistik material.	12	\N	\N	\N	\N	KENDARAAN	\N	\N
c0000001-0003-0000-0000-000000000001	c0000001-0000-0000-0000-000000000001	INTI-RINGAN	Kendaraan & Alat Ringan	Kendaraan dan alat pendukung ringan	\N	2026-07-28 06:53:48.611895+00	2026-07-28 06:53:50.62434+00	straight_line	\N	\N	ASET INTI (RENTAL)	C	["Pick-Up / Truk Ringan", "Bus / Mobil Penumpang", "Genset", "Kompresor", "Concrete Vibrator"]	Aset Pendukung Rental. Melayani kebutuhan proyek yang lebih ringan atau spesifik.	13	\N	\N	\N	\N	KENDARAAN	\N	\N
c0000002-0001-0000-0000-000000000001	c0000002-0000-0000-0000-000000000002	OPS-KENDARAAN	Kendaraan Dinas & Logistik	Kendaraan untuk operasional internal	\N	2026-07-28 06:53:48.611895+00	2026-07-28 06:53:50.62434+00	straight_line	\N	\N	ASET OPERASIONAL	A	["Mobil Dinas Manager/Operasional", "Kendaraan Servis/Mekanik (Service Truck)", "Mobil Tangki Bahan Bakar/Bensin", "Forklift Gudang"]	Untuk Mendukung Aktivitas Perusahaan. Tidak untuk disewa, tetapi untuk transportasi internal, servis, dan logistik.	21	\N	\N	\N	\N	KENDARAAN	\N	\N
44444444-4444-4444-4444-444444444441	44444444-4444-4444-4444-444444444403	DUMP-TRUCK	Dump Truck	\N	\N	2026-07-28 06:53:49.793435+00	2026-07-28 06:53:50.62434+00	straight_line	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	\N	KENDARAAN	\N	\N
44444444-4444-4444-4444-444444444442	44444444-4444-4444-4444-444444444403	OPERATIONAL	Kendaraan Operasional	\N	\N	2026-07-28 06:53:49.793435+00	2026-07-28 06:53:50.62434+00	straight_line	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	\N	KENDARAAN	\N	\N
44444444-4444-4444-4444-444444444401	\N	IT-EQUIP	Peralatan IT	\N	\N	2026-07-28 06:53:48.524635+00	2026-07-28 06:53:50.62434+00	straight_line	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	\N	INFRASTRUKTUR	\N	\N
44444444-4444-4444-4444-444444444402	\N	FURNITURE	Furniture	\N	\N	2026-07-28 06:53:48.524635+00	2026-07-28 06:53:50.62434+00	straight_line	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	\N	INFRASTRUKTUR	\N	\N
44444444-4444-4444-4444-444444444404	\N	MACHINERY	Mesin & Peralatan	\N	\N	2026-07-28 06:53:48.524635+00	2026-07-28 06:53:50.62434+00	straight_line	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	\N	INFRASTRUKTUR	\N	\N
44444444-4444-4444-4444-444444444405	\N	BUILDING	Bangunan	\N	\N	2026-07-28 06:53:48.524635+00	2026-07-28 06:53:50.62434+00	straight_line	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	\N	INFRASTRUKTUR	\N	\N
c0000002-0002-0000-0000-000000000001	c0000002-0000-0000-0000-000000000002	OPS-BENGKEL	Peralatan Bengkel & Servis	Peralatan untuk pemeliharaan aset	\N	2026-07-28 06:53:48.611895+00	2026-07-28 06:53:50.62434+00	straight_line	\N	\N	ASET OPERASIONAL	B	["Mesin Las", "Alat Ukur Teknis", "Tools Kit Mekanik", "Engine Analyzer", "Press Machine", "Mesin Bubut/Bor"]	Untuk Pemeliharaan Aset Rental. Memastikan aset inti selalu dalam kondisi siap sewa.	22	\N	\N	\N	\N	INFRASTRUKTUR	\N	\N
c0000002-0003-0000-0000-000000000001	c0000002-0000-0000-0000-000000000002	OPS-KANTOR	Peralatan Kantor & IT	Peralatan kantor dan teknologi informasi	\N	2026-07-28 06:53:48.611895+00	2026-07-28 06:53:50.62434+00	straight_line	\N	\N	ASET OPERASIONAL	C	["Komputer, Laptop, Printer", "Server & Jaringan IT", "Software Manajemen Rental & Akuntansi", "Perabotan Kantor"]	Untuk Administrasi dan Manajemen. Mendukung operasional bisnis, pelaporan, dan komunikasi.	23	\N	\N	\N	\N	INFRASTRUKTUR	\N	\N
c0000003-0002-0000-0000-000000000001	c0000003-0000-0000-0000-000000000003	INFRA-BANGUNAN	Bangunan	Bangunan milik perusahaan	\N	2026-07-28 06:53:48.611895+00	2026-07-28 06:53:50.62434+00	straight_line	\N	\N	ASET TETAP INFRASTRUKTUR	B	["Kantor Pusat/Cabang", "Bangunan Bengkel", "Gudang Sparepart", "Pos Security"]	Fasilitas Operasional. Tempat bekerja, mereparasi, dan menyimpan inventaris.	32	\N	\N	\N	\N	INFRASTRUKTUR	\N	\N
c0000003-0000-0000-0000-000000000003	\N	ASET-INFRA	Aset Tetap Infrastruktur	Aset infrastruktur dan properti perusahaan	\N	2026-07-28 06:53:48.611895+00	2026-07-28 06:53:50.62434+00	straight_line	\N	\N	ASET TETAP INFRASTRUKTUR	\N	\N	Akomodasi Lokasi Usaha. Bisa sebagai tempat operasional atau investasi jangka panjang.	3	\N	\N	\N	\N	INFRASTRUKTUR	\N	\N
c0000003-0003-0000-0000-000000000001	c0000003-0000-0000-0000-000000000003	INFRA-PENDUKUNG	Infrastruktur Pendukung	Infrastruktur pendukung operasional	\N	2026-07-28 06:53:48.611895+00	2026-07-28 06:53:50.62434+00	straight_line	\N	\N	ASET TETAP INFRASTRUKTUR	C	["Pagar Keliling & Gerbang", "Jalan Hardscape di Yard", "Instalasi Listrik & Air", "Sistem Drainase", "Fuel Station Mini (SPBU Mini)"]	Penunjang Kegiatan di Lokasi. Membuat area operasional aman, tertib, dan efisien.	33	\N	\N	\N	\N	INFRASTRUKTUR	\N	\N
\.


--
-- Data for Name: category_attribute_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.category_attribute_templates (id, category_id, attributes, created_at, updated_at) FROM stdin;
e5667583-73ed-4033-b4cf-c4e23f9cf358	c0000001-0001-0000-0000-000000000001	["Capacity (Ton/Hr)", "Power (KW)", "Input Size", "Output Size", "Engine Power (HP)", "Operating Weight (kg)"]	2026-07-28 06:53:49.539308+00	2026-07-28 06:53:49.539308+00
d9eccda6-1eef-48c2-9a6e-4c4b6b4cac14	44444444-4444-4444-4444-444444444403	["license_plate", "bpkb_number", "vin", "engine_number", "stnk_expiry", "kir_expiry", "tax_expiry", "fuel_type", "transmission", "odometer_last"]	2026-07-28 06:53:49.549322+00	2026-07-28 06:53:49.549322+00
\.


--
-- Data for Name: chart_of_accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.chart_of_accounts (id, code, name, account_type, normal_balance, parent_id, is_active, description, currency, created_at, updated_at, is_group, is_frozen) FROM stdin;
00000000-0000-4001-a111-000000000001	1-1110	Kas Tunai	asset	debit	00000000-0000-4001-a110-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00	f	f
00000000-0000-4001-a112-000000000001	1-1210	Bank BCA	asset	debit	00000000-0000-4001-a110-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00	f	f
00000000-0000-4001-a112-000000000002	1-1220	Bank Mandiri	asset	debit	00000000-0000-4001-a110-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00	f	f
dabd71f6-cbe1-445d-9c99-1a6cb11a1fd0	1-1310	Piutang Belum Ditagih	asset	debit	00000000-0000-4001-a120-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00	f	f
00000000-0000-4001-a131-000000000000	1-1410	Persediaan Suku Cadang	asset	debit	00000000-0000-4001-a130-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00	f	f
00000000-0000-4001-a132-000000000000	1-1420	Persediaan Pelumas & Kimia	asset	debit	00000000-0000-4001-a130-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00	f	f
00000000-0000-4001-a133-000000000000	1-1430	Persediaan Ban (Tires)	asset	debit	00000000-0000-4001-a130-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00	f	f
27e34efc-5816-4e2b-acb9-e5259332b40d	1-1510	Beban Dibayar Dimuka	asset	debit	00000000-0000-4001-a100-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00	f	f
5a4abfc0-e078-4dbd-92a7-78b5e95cc9cc	1-1520	Uang Muka Pembelian	asset	debit	00000000-0000-4001-a100-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00	f	f
319380d9-23ac-4a39-95c3-cc6222d9f9ff	1-2110	Tanah	asset	debit	00000000-0000-4001-a210-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00	f	f
559bdc48-fb7e-4b10-b1e7-42bbe8fdd46c	1-2120	Bangunan	asset	debit	00000000-0000-4001-a210-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00	f	f
00000000-0000-4001-a220-000000000000	1-2200	Kendaraan	asset	debit	00000000-0000-4001-a200-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00	f	f
241cd42a-9330-4396-8743-47930ae7d1bf	1-2310	Peralatan Kantor	asset	debit	00000000-0000-4001-a230-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00	f	f
18cdfb3b-84d6-466f-9e92-eaa9ac928488	1-2910	Akum. Penyusutan Bangunan	asset	credit	00000000-0000-4001-a290-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00	f	f
ca65a2e1-3ef8-4cfc-9b37-74a70181d900	1-2920	Akum. Penyusutan Kendaraan	asset	credit	00000000-0000-4001-a290-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00	f	f
78a70ff8-8114-4543-8b0d-af1f69768e75	1-2930	Akum. Penyusutan Mesin/Peralatan	asset	credit	00000000-0000-4001-a290-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00	f	f
27efd26a-cde6-495a-9f1f-3f9146c40a96	2-1110	Utang Usaha	liability	credit	00000000-0000-4002-a100-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00	f	f
131ec164-6bbb-46cd-a3f6-bda23317f92a	2-1120	Utang Belum Ditagih	liability	credit	00000000-0000-4002-a100-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00	f	f
a9c0a61d-0051-4a59-ac24-134997596fcd	2-1210	Utang Gaji	liability	credit	00000000-0000-4002-a100-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00	f	f
02a98fc9-f209-4142-b982-994f09aeb203	2-1310	Utang Pajak - PPN	liability	credit	00000000-0000-4002-a100-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00	f	f
e2647f3d-470c-4819-907b-4b0409f6ed1e	2-2110	Utang Bank Jangka Panjang	liability	credit	00000000-0000-4002-a200-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00	f	f
00000000-0000-4003-a110-000000000001	3-1100	Modal Disetor	equity	credit	00000000-0000-4003-a000-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00	f	f
00000000-0000-4003-a120-000000000001	3-1200	Saldo Laba Ditahan	equity	credit	00000000-0000-4003-a000-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00	f	f
76ffbc1e-4ec0-40ab-bec0-af32b798e206	3-1300	Prive / Pengambilan Pemilik	equity	debit	00000000-0000-4003-a000-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00	f	f
00000000-0000-4004-a110-000000000001	4-1100	Pendapatan Penjualan	revenue	credit	00000000-0000-4004-a000-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00	f	f
00000000-0000-4004-a120-000000000001	4-1200	Pendapatan Jasa / Rental	revenue	credit	00000000-0000-4004-a000-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00	f	f
dad44fae-f110-4218-ab7b-92d0b48775b0	4-1900	Diskon Penjualan	revenue	debit	00000000-0000-4004-a000-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00	f	f
00000000-0000-4005-a111-000000000000	5-1110	Biaya Suku Cadang & Maintenance	expense	debit	00000000-0000-4005-a100-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00	f	f
00000000-0000-4005-a112-000000000000	5-1120	Biaya Pelumas & Bahan Kimia	expense	debit	00000000-0000-4005-a100-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00	f	f
00000000-0000-4005-a113-000000000000	5-1130	Biaya Penggantian Ban	expense	debit	00000000-0000-4005-a100-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00	f	f
00000000-0000-4006-a110-000000000001	6-1100	Gaji Pokok & Tunjangan	expense	debit	00000000-0000-4006-a100-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00	f	f
459b574a-c78e-455b-8679-791eb5264179	6-1200	Lembur & Komisi	expense	debit	00000000-0000-4006-a100-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00	f	f
2c1d1573-455a-467b-830c-ec8bf7d223b9	6-1300	BPJS / Asuransi Pegawai	expense	debit	00000000-0000-4006-a100-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00	f	f
00000000-0000-4006-a210-000000000001	6-2100	Biaya Listrik, Air & Internet	expense	debit	00000000-0000-4006-a200-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00	f	f
2d6ffe52-d6cc-4273-8d03-9c6ff2645c64	6-2200	Biaya Keamanan & Kebersihan	expense	debit	00000000-0000-4006-a200-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00	f	f
079ca788-61f0-47a8-9c68-d5a5fe367cf4	6-2310	Biaya ATK / Perlengkapan	expense	debit	00000000-0000-4006-a200-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00	f	f
38cfe158-42e1-415b-ab3e-30f72a3a88c7	6-3110	Iklan & Promosi Digital	expense	debit	00000000-0000-4006-a300-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00	f	f
00000000-0000-4006-a900-000000000000	6-9000	Beban Penyusutan Aset Tetap	expense	debit	00000000-0000-4006-a000-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00	f	f
b16ed04f-4883-41f3-b2f8-fce0f6079a8b	8-1100	Pendapatan Bunga Bank	revenue	credit	00000000-0000-4008-a000-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00	f	f
49554d0a-fe1a-4768-a386-8d4bc3715b70	8-1200	Laba Pelepasan Aset Tetap	revenue	credit	00000000-0000-4008-a000-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00	f	f
c0a9f43d-1016-4e78-bcc7-c13ea3ab7c0b	9-1100	Beban Bunga Pinjaman	expense	debit	00000000-0000-4009-a000-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00	f	f
893953d5-3e34-4484-97a8-6c8e339130d7	9-1200	Biaya Admin Bank	expense	debit	00000000-0000-4009-a000-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00	f	f
00000000-0000-4002-a113-000000000000	2-1130	Hutang BBM	liability	credit	00000000-0000-4002-a100-000000000000	t	Kewajiban pembayaran BBM (Fuel Payable)	IDR	2026-07-28 06:53:50.480407+00	2026-07-28 06:53:50.480407+00	f	f
00000000-0000-4005-a114-000000000000	5-1140	Biaya Bahan Bakar	expense	debit	00000000-0000-4005-a100-000000000000	t	Biaya operasional untuk bahan bakar (Fuel Expense)	IDR	2026-07-28 06:53:50.480407+00	2026-07-28 06:53:50.480407+00	f	f
00000000-0000-4002-a114-000000000000	2-1140	Utang Biaya Legal Armada	liability	credit	00000000-0000-4002-a100-000000000000	t	Kewajiban pembayaran Pajak, STNK, KIR, dan dokumen legal armada lainnya	IDR	2026-07-28 06:53:50.488379+00	2026-07-28 06:53:50.488379+00	f	f
00000000-0000-4006-a199-000000000000	6-1999	Alokasi Tenaga Kerja	expense	credit	00000000-0000-4006-a100-000000000000	t	Akun kontra untuk alokasi biaya tenaga kerja internal ke pemeliharaan aset	IDR	2026-07-28 06:53:50.496024+00	2026-07-28 06:53:50.496024+00	f	f
00000000-0000-4001-a000-000000000000	1-0000	Aset	asset	debit	\N	t	Total Aset Perusahaan	IDR	2026-07-28 06:53:50.201328+00	2026-08-07 03:51:16.432909+00	t	f
00000000-0000-4001-a100-000000000000	1-1000	Aset Lancar	asset	debit	00000000-0000-4001-a000-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-08-07 03:51:16.432909+00	t	f
00000000-0000-4001-a110-000000000000	1-1100	Kas & Bank	asset	debit	00000000-0000-4001-a100-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-08-07 03:51:16.432909+00	t	f
00000000-0000-4001-a120-000000000000	1-1300	Piutang Usaha	asset	debit	00000000-0000-4001-a100-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-08-07 03:51:16.432909+00	t	f
00000000-0000-4001-a130-000000000000	1-1400	Persediaan	asset	debit	00000000-0000-4001-a100-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-08-07 03:51:16.432909+00	t	f
00000000-0000-4001-a200-000000000000	1-2000	Aset Tetap	asset	debit	00000000-0000-4001-a000-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-08-07 03:51:16.432909+00	t	f
00000000-0000-4001-a210-000000000000	1-2100	Tanah & Bangunan	asset	debit	00000000-0000-4001-a200-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-08-07 03:51:16.432909+00	t	f
00000000-0000-4001-a230-000000000000	1-2300	Mesin & Peralatan	asset	debit	00000000-0000-4001-a200-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-08-07 03:51:16.432909+00	t	f
00000000-0000-4001-a290-000000000000	1-2900	Akumulasi Penyusutan	asset	credit	00000000-0000-4001-a200-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-08-07 03:51:16.432909+00	t	f
00000000-0000-4002-a000-000000000000	2-0000	Kewajiban	liability	credit	\N	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-08-07 03:51:16.432909+00	t	f
00000000-0000-4002-a100-000000000000	2-1000	Kewajiban Lancar	liability	credit	00000000-0000-4002-a000-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-08-07 03:51:16.432909+00	t	f
00000000-0000-4002-a200-000000000000	2-2000	Kewajiban Jangka Panjang	liability	credit	00000000-0000-4002-a000-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-08-07 03:51:16.432909+00	t	f
00000000-0000-4003-a000-000000000000	3-0000	Ekuitas	equity	credit	\N	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-08-07 03:51:16.432909+00	t	f
00000000-0000-4004-a000-000000000000	4-0000	Pendapatan Usaha	revenue	credit	\N	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-08-07 03:51:16.432909+00	t	f
00000000-0000-4005-a000-000000000000	5-0000	Harga Pokok Penjualan	expense	debit	\N	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-08-07 03:51:16.432909+00	t	f
00000000-0000-4005-a100-000000000000	5-1000	Beban Pokok Pendapatan	expense	debit	00000000-0000-4005-a000-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-08-07 03:51:16.432909+00	t	f
00000000-0000-4006-a000-000000000000	6-0000	Beban Operasional	expense	debit	\N	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-08-07 03:51:16.432909+00	t	f
00000000-0000-4006-a100-000000000000	6-1000	Beban Gaji & Personalia	expense	debit	00000000-0000-4006-a000-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-08-07 03:51:16.432909+00	t	f
00000000-0000-4006-a200-000000000000	6-2000	Beban Umum & Administrasi	expense	debit	00000000-0000-4006-a000-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-08-07 03:51:16.432909+00	t	f
00000000-0000-4006-a300-000000000000	6-3000	Beban Pemasaran	expense	debit	00000000-0000-4006-a000-000000000000	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-08-07 03:51:16.432909+00	t	f
00000000-0000-4008-a000-000000000000	8-0000	Pendapatan Lain-lain	revenue	credit	\N	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-08-07 03:51:16.432909+00	t	f
00000000-0000-4009-a000-000000000000	9-0000	Beban Lain-lain	expense	debit	\N	t	\N	IDR	2026-07-28 06:53:50.201328+00	2026-08-07 03:51:16.432909+00	t	f
\.


--
-- Data for Name: client_contacts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.client_contacts (id, client_id, name, "position", email, phone, can_approve_timesheet, can_approve_billing, approval_limit, is_primary, is_active, signature_specimen, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clients (id, client_code, name, company_name, email, phone, address, city, contact_person, tax_id, is_active, notes, created_at, updated_at, company_id, credit_limit, currency, npwp, nik, tax_name, tax_address) FROM stdin;
\.


--
-- Data for Name: commercial_contracts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.commercial_contracts (id, company_id, contract_number, client_id, start_date, end_date, status, created_at) FROM stdin;
\.


--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.companies (id, tenant_id, code, name, legal_name, tax_id, base_currency, country, address, phone, email, default_bank_account_id, fiscal_year_start_month, status, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: contract_approvals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contract_approvals (id, contract_id, approver_id, action, notes, created_at, delegated_to, approval_level) FROM stdin;
\.


--
-- Data for Name: contract_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contract_documents (id, contract_id, document_type, file_name, file_path, file_size, mime_type, version, is_active, notes, uploaded_by, uploaded_at) FROM stdin;
\.


--
-- Data for Name: contract_renewals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contract_renewals (id, original_contract_id, new_contract_id, renewal_type, previous_end_date, new_end_date, notes, renewed_by, renewed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: contract_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contract_templates (id, name, description, header_content, body_content, footer_content, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: cost_centers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cost_centers (id, tenant_id, company_id, code, name, parent_id, manager_id, status, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: currencies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.currencies (id, code, name, symbol) FROM stdin;
1	IDR	Rupiah Indonesia	Rp
2	USD	US Dollar	$
3	EUR	Euro	€
\.


--
-- Data for Name: custom_docperms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.custom_docperms (id, doctype_id, role_id, permlevel, read_perm, write_perm, create_perm, delete_perm, submit_perm, cancel_perm, amend_perm, print_perm, email_perm, export_perm, import_perm, share_perm, report_perm, if_owner, created_at, updated_at) FROM stdin;
13c8ecd9-a3af-40dc-9fdb-e3971ab9542a	4b4d2dc6-2e09-4f33-9c21-991daae6cdc9	2ecd1ce9-9227-48d0-9872-5038df943714	0	t	t	t	t	t	t	t	t	t	t	t	t	t	f	2026-08-07 06:23:44.092485+00	2026-08-07 06:23:44.092485+00
c4c51a92-3bc1-4618-b8f7-78cdb0bba560	4b4d2dc6-2e09-4f33-9c21-991daae6cdc9	0022d4ed-c891-4301-8ea1-1b73b51f93ac	0	t	t	t	f	t	f	t	t	t	t	f	t	t	f	2026-08-07 06:23:44.092485+00	2026-08-07 06:23:44.092485+00
d7d4dfa1-5c3b-43b3-98ae-f5d0e4b36802	a1b8140f-e5bf-4294-98d4-0e54803e72f6	2ecd1ce9-9227-48d0-9872-5038df943714	0	t	t	t	t	t	t	t	t	t	t	t	t	t	f	2026-08-07 06:23:44.092485+00	2026-08-07 06:23:44.092485+00
25c2e17f-d071-45fe-9e63-e9995ba84dcd	a1b8140f-e5bf-4294-98d4-0e54803e72f6	0022d4ed-c891-4301-8ea1-1b73b51f93ac	0	t	t	t	f	t	f	t	t	t	t	f	t	t	f	2026-08-07 06:23:44.092485+00	2026-08-07 06:23:44.092485+00
f7db4b9d-ae95-48d3-976e-b93647c40730	6771e0c1-8865-4199-8a3c-4c7f868ec56d	2ecd1ce9-9227-48d0-9872-5038df943714	0	t	t	t	t	t	t	t	t	t	t	t	t	t	f	2026-08-07 06:23:44.092485+00	2026-08-07 06:23:44.092485+00
6e462c53-59d6-470c-999d-706f1543c433	6771e0c1-8865-4199-8a3c-4c7f868ec56d	0022d4ed-c891-4301-8ea1-1b73b51f93ac	0	t	t	t	f	t	f	t	t	t	t	f	t	t	f	2026-08-07 06:23:44.092485+00	2026-08-07 06:23:44.092485+00
0b4a971d-9f7c-4ab5-9621-77d78373960c	32e860a6-053d-4a8b-892b-e17613de5ea6	2ecd1ce9-9227-48d0-9872-5038df943714	0	t	t	t	t	t	t	t	t	t	t	t	t	t	f	2026-08-07 06:23:44.092485+00	2026-08-07 06:23:44.092485+00
17661100-b0e0-496c-b9a0-babbfa736864	32e860a6-053d-4a8b-892b-e17613de5ea6	0022d4ed-c891-4301-8ea1-1b73b51f93ac	0	t	t	t	f	t	f	t	t	t	t	f	t	t	f	2026-08-07 06:23:44.092485+00	2026-08-07 06:23:44.092485+00
df46d5e8-a149-42c4-aa96-34cb4cfb5092	b990031a-ae81-4939-bf53-373dc61eda59	2ecd1ce9-9227-48d0-9872-5038df943714	0	t	t	t	t	t	t	t	t	t	t	t	t	t	f	2026-08-07 06:23:44.092485+00	2026-08-07 06:23:44.092485+00
7d1affd9-cbcc-4b6b-9c12-9f783b8e5416	b990031a-ae81-4939-bf53-373dc61eda59	0022d4ed-c891-4301-8ea1-1b73b51f93ac	0	t	t	t	f	t	f	t	t	t	t	f	t	t	f	2026-08-07 06:23:44.092485+00	2026-08-07 06:23:44.092485+00
a8493c4b-8750-450e-b604-486124059b19	1c4f78be-00da-48c9-8f72-01f38d79be76	2ecd1ce9-9227-48d0-9872-5038df943714	0	t	t	t	t	t	t	t	t	t	t	t	t	t	f	2026-08-07 06:23:44.092485+00	2026-08-07 06:23:44.092485+00
8aa0b3c2-8272-4b15-a278-03098293a117	1c4f78be-00da-48c9-8f72-01f38d79be76	0022d4ed-c891-4301-8ea1-1b73b51f93ac	0	t	t	t	f	t	f	t	t	t	t	f	t	t	f	2026-08-07 06:23:44.092485+00	2026-08-07 06:23:44.092485+00
b6eae2da-5cae-42b0-9ce8-381973a9c6d4	2795b000-2ef5-441c-b524-cde860e69694	2ecd1ce9-9227-48d0-9872-5038df943714	0	t	t	t	t	t	t	t	t	t	t	t	t	t	f	2026-08-07 06:23:44.092485+00	2026-08-07 06:23:44.092485+00
f457b865-7554-4167-a64a-f46980824fe1	2795b000-2ef5-441c-b524-cde860e69694	0022d4ed-c891-4301-8ea1-1b73b51f93ac	0	t	t	t	f	t	f	t	t	t	t	f	t	t	f	2026-08-07 06:23:44.092485+00	2026-08-07 06:23:44.092485+00
9b06e456-e85f-4ee1-9b1f-4da5906ef468	02152cb7-810e-4d95-b91d-7beee66cc53a	2ecd1ce9-9227-48d0-9872-5038df943714	0	t	t	t	t	t	t	t	t	t	t	t	t	t	f	2026-08-07 06:23:44.092485+00	2026-08-07 06:23:44.092485+00
bfad6ddc-d1da-4676-8e70-863095caefb0	02152cb7-810e-4d95-b91d-7beee66cc53a	0022d4ed-c891-4301-8ea1-1b73b51f93ac	0	t	t	t	f	t	f	t	t	t	t	f	t	t	f	2026-08-07 06:23:44.092485+00	2026-08-07 06:23:44.092485+00
\.


--
-- Data for Name: data_import_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.data_import_logs (id, data_import_id, row_number, status, record_identifier, messages, row_data, created_at) FROM stdin;
\.


--
-- Data for Name: data_imports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.data_imports (id, doctype_name, import_type, file_name, status, total_rows, successful_rows, failed_rows, created_by_user_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: data_migration_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.data_migration_logs (id, migration_name, step_number, step_name, records_inventoried, records_backfilled, reconciled_sum_delta, status, executed_at) FROM stdin;
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.departments (id, code, name, parent_id, created_at, updated_at, organization_id, description) FROM stdin;
22222222-2222-2222-2222-222222222201	IT	IT Department	\N	2026-07-28 06:53:48.524635+00	2026-07-28 06:53:48.524635+00	11111111-1111-1111-1111-111111111111	\N
22222222-2222-2222-2222-222222222202	HR	Human Resources	\N	2026-07-28 06:53:48.524635+00	2026-07-28 06:53:48.524635+00	11111111-1111-1111-1111-111111111111	\N
22222222-2222-2222-2222-222222222203	FIN	Finance	\N	2026-07-28 06:53:48.524635+00	2026-07-28 06:53:48.524635+00	11111111-1111-1111-1111-111111111111	\N
22222222-2222-2222-2222-222222222204	OPS	Operations	\N	2026-07-28 06:53:48.524635+00	2026-07-28 06:53:48.524635+00	11111111-1111-1111-1111-111111111111	\N
22222222-2222-2222-2222-222222222205	MKT	Marketing	\N	2026-07-28 06:53:48.524635+00	2026-07-28 06:53:48.524635+00	11111111-1111-1111-1111-111111111111	\N
\.


--
-- Data for Name: depreciation_schedules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.depreciation_schedules (id, asset_id, period_start, period_end, opening_value, depreciation_amount, accumulated_depreciation, closing_value, depreciation_method, is_calculated, calculated_at, created_at) FROM stdin;
\.


--
-- Data for Name: doctypes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.doctypes (id, name, module, description, is_submittable, created_at) FROM stdin;
4b4d2dc6-2e09-4f33-9c21-991daae6cdc9	Asset	Assets	Manajemen Aset Perusahaan	f	2026-08-07 06:23:44.084081+00
a1b8140f-e5bf-4294-98d4-0e54803e72f6	Employee	HR	Data Karyawan & Kepegawaian	f	2026-08-07 06:23:44.084081+00
6771e0c1-8865-4199-8a3c-4c7f868ec56d	Attendance	HR	Absensi & Kehadiran Karyawan	f	2026-08-07 06:23:44.084081+00
32e860a6-053d-4a8b-892b-e17613de5ea6	InventoryItem	Inventory	Stok & Barang Material	f	2026-08-07 06:23:44.084081+00
b990031a-ae81-4939-bf53-373dc61eda59	WorkOrder	Maintenance	Perintah Kerja Pemeliharaan	t	2026-08-07 06:23:44.084081+00
1c4f78be-00da-48c9-8f72-01f38d79be76	PurchaseOrder	Purchase	Pesanan Pembelian	t	2026-08-07 06:23:44.084081+00
2795b000-2ef5-441c-b524-cde860e69694	SalesInvoice	Sales	Faktur Penjualan	t	2026-08-07 06:23:44.084081+00
02152cb7-810e-4d95-b91d-7beee66cc53a	RentalContract	Rentals	Kontrak Sewa Aset	t	2026-08-07 06:23:44.084081+00
\.


--
-- Data for Name: document_audit_trail; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.document_audit_trail (id, document_id, document_type, action, actor_id, tenant_id, company_id, from_status, to_status, document_version, reason, correlation_id, recorded_at) FROM stdin;
\.


--
-- Data for Name: employee_evaluations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employee_evaluations (id, employee_id, evaluator_id, year, period, score, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employees (id, nik, name, email, phone, department_id, "position", employment_status, user_id, is_active, created_at, updated_at, ktp_number, photo_url, gender, place_of_birth, date_of_birth, marital_status, children_count, address, residence_status, religion, blood_type, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, start_date, end_contract_date, resignation_date, resignation_reason, is_manager, manager_id, is_evaluator, education, grade, competencies, competency_attachments, bank_account, bank_name, npwp, bpjs_kesehatan, bpjs_tenaga_kerja, basic_salary, is_allowance, allowances, leave_balance, leave_used, face_embeddings, face_verification_status, office_location_id, allowed_radius, assigned_asset_id, work_area_id, is_account_requested) FROM stdin;
9a67fd10-7a0e-4c42-805c-85fdd2bfd882	EMP002	Asbar Risno	vehicle@sjs.com	081234567891	22222222-2222-2222-2222-222222222204	Vehicle Admin	pkwtt	05d7fe35-5f4f-45e7-8ca4-e7ff4d8f307e	t	2026-07-28 06:53:49.009037+00	2026-08-04 02:03:46.762279+00	\N	/api/uploads/2026/08/01/aaf89b65-4dd2-4a16-a323-da884fd7ca2f.webp	\N	\N	\N	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	f	\N	12	0	\N	none	\N	50	\N	\N	f
904e6a07-b88d-406b-b09d-d2707fcf00d4	EMP015	Infras	infra@sjs.com	081234567805	22222222-2222-2222-2222-222222222204	Infrastructure Admin	pkwtt	4dcd4d42-f79f-41e6-bb61-ecae5eb1239a	t	2026-07-28 06:53:49.040903+00	2026-08-04 02:04:05.589202+00	\N	/api/uploads/2026/08/01/41a38c6f-c7c0-42d2-a8a7-1f94c32b989d.webp	\N	\N	\N	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	f	\N	12	0	\N	none	\N	50	\N	\N	f
31c73b4f-830e-4a80-ab20-a0398c27f841	EMP008	Rudi Hartono	rudi.h@example.com	081298765434	22222222-2222-2222-2222-222222222204	Technician	magang	\N	t	2026-07-28 06:53:49.009037+00	2026-07-28 06:53:49.009037+00	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	12	0	\N	none	\N	50	\N	\N	f
79d72c68-f550-4838-868b-42079d48f460	EMP009	Dewi Lestari	dewi.l@example.com	081298765435	22222222-2222-2222-2222-222222222202	Recruiter	pkwt	\N	t	2026-07-28 06:53:49.009037+00	2026-07-28 06:53:49.009037+00	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	12	0	\N	none	\N	50	\N	\N	f
67caf55f-1e47-4294-8333-6d2911ec8720	EMP010	Eko Purnomo	eko.p@example.com	081298765436	22222222-2222-2222-2222-222222222204	Driver	lainnya	\N	t	2026-07-28 06:53:49.009037+00	2026-07-28 06:53:49.009037+00	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	12	0	\N	none	\N	50	\N	\N	f
7ed53101-d537-41fc-aace-7a8435262ab4	EMP011	System Administrator	admin@sjs.com	081234567801	22222222-2222-2222-2222-222222222201	Super Admin	pkwtt	00000000-0000-0000-0000-000000000001	t	2026-07-28 06:53:49.040903+00	2026-08-04 02:04:21.30856+00	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	f	\N	12	0	\N	none	\N	50	\N	\N	f
33ea05d7-9875-497c-8e33-121e584d98c5	EMP004	Supervisor Operasional	supervisor@example.com	081234567893	22222222-2222-2222-2222-222222222204	Supervisor	pkwtt	4c25547a-79b4-42f3-b1ca-bbb7c106fec3	t	2026-07-28 06:53:49.009037+00	2026-07-28 06:53:49.009037+00	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	12	0	\N	none	\N	50	\N	\N	f
f05507c1-cd41-447f-abe1-4a57f7338d87	EMP005	Organization Admin	org.admin@example.com	081234567894	22222222-2222-2222-2222-222222222202	HR Manager	pkwtt	b411646d-e00b-4a66-a588-a3e17bedc887	t	2026-07-28 06:53:49.009037+00	2026-07-28 06:53:49.009037+00	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	12	0	\N	none	\N	50	\N	\N	f
d92486b5-17d6-409b-b00f-cd2aee5b5cf9	EMP-001	Admin User	admin@example.com	\N	\N	\N	pkwt	00000000-0000-0000-0000-000000000099	t	2026-08-07 05:43:45.916786+00	2026-08-07 05:43:45.916786+00	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	12	0	\N	none	\N	50	\N	\N	f
06544855-42b2-4aad-9040-c576444fc133	EMP012	Asset Manager	manager@example.com	081234567802	22222222-2222-2222-2222-222222222204	Manager Asset	pkwtt	00000000-0000-0000-0000-000000000002	t	2026-07-28 06:53:49.040903+00	2026-07-28 06:53:49.040903+00	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	12	0	\N	none	\N	50	\N	\N	f
f43b69fe-3ef9-4a3d-9459-092a9f5704f8	EMP013	Maintenance Technician	technician@example.com	081234567803	22222222-2222-2222-2222-222222222204	Senior Technician	pkwt	00000000-0000-0000-0000-000000000003	t	2026-07-28 06:53:49.040903+00	2026-07-28 06:53:49.040903+00	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	12	0	\N	none	\N	50	\N	\N	f
86bb41fa-4468-4805-af4e-c05310cd2e2c	EMP014	Regular User	user@example.com	081234567804	22222222-2222-2222-2222-222222222202	HR Staff	pkwt	00000000-0000-0000-0000-000000000004	t	2026-07-28 06:53:49.040903+00	2026-07-28 06:53:49.040903+00	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	12	0	\N	none	\N	50	\N	\N	f
93981098-faed-44e0-8de1-a833ce9cc9a2	EMP006	Budi Santoso	budi.san@example.com	081298765432	22222222-2222-2222-2222-222222222201	IT Support	pkwt	60dbb079-1af9-48bf-a386-c661ae28ea3d	t	2026-07-28 06:53:49.009037+00	2026-08-03 09:02:38.156047+00	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	f	\N	12	0	\N	none	\N	50	\N	\N	t
6ca17cb3-153d-44b3-89ee-4ae6ee7a3039	EMP001	Ambo Tuo	heavy@sjs.com	081234567890	22222222-2222-2222-2222-222222222204	Heavy Equipment Admin	pkwtt	8d957363-f1b5-4373-9fc4-15c50f3988e3	t	2026-07-28 06:53:49.009037+00	2026-08-04 02:03:25.402914+00	\N	/api/uploads/2026/08/01/5d114490-de92-412e-8c47-020f93424a86.webp	\N	\N	\N	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	f	\N	12	0	\N	none	\N	50	\N	\N	f
eb1e62d9-453c-4efd-bb4d-8f280257c355	EMP003	General Staff	staff@example.com	081234567892	22222222-2222-2222-2222-222222222204	Staff Operasional	pkwt	d6d34f98-d4b0-4475-b071-fe93b9a0c845	t	2026-07-28 06:53:49.009037+00	2026-08-01 04:32:30.299611+00	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	12	0	\N	none	\N	50	\N	\N	f
0b14fc17-8278-4b74-be03-9f40d5d2e34e	EMP007	Siti Aminah	siti.a@example.com	081298765433	22222222-2222-2222-2222-222222222203	Finance Staff	pkwtt	\N	t	2026-07-28 06:53:49.009037+00	2026-08-03 04:37:09.609889+00	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	12	0	\N	none	\N	50	\N	\N	t
\.


--
-- Data for Name: entity_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.entity_types (id, name, module, storage_strategy, is_custom, version, created_at, updated_at) FROM stdin;
609a3650-cc4b-4c2d-8f42-256b5c86c0fb	ASSET	asset_management	HYBRID_JSONB	t	1	2026-08-07 05:04:41.040424+00	2026-08-07 05:04:41.040425+00
\.


--
-- Data for Name: expense_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expense_items (id, expense_id, account_id, description, amount) FROM stdin;
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expenses (id, expense_number, date, pay_from_account_id, recipient, total_amount, status, journal_entry_id, created_at, updated_at, attachment_url, expense_type) FROM stdin;
\.


--
-- Data for Name: face_photos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.face_photos (id, employee_id, photo_path, photo_order, created_at) FROM stdin;
\.


--
-- Data for Name: field_definitions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.field_definitions (id, entity_type_id, field_name, label, data_type, is_required, is_readonly, default_value, options_json, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: fiscal_years; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fiscal_years (id, company_id, year_name, start_date, end_date, is_closed, closed_at, closed_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: fuel_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fuel_logs (id, tracking_number, asset_id, requested_by, driver_id, odometer_reading, odometer_image_url, request_type, requested_value, status, coupon_code, approved_by, approved_at, rejection_reason, actual_filled_amount, actual_volume, receipt_image_url, completed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: furniture_details; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.furniture_details (asset_id, furniture_type, material, dimensions, color, capacity, created_at, updated_at) FROM stdin;
66666666-6666-6666-6666-666666666612	\N	\N	\N	\N	\N	2026-07-28 09:11:56.808295+00	2026-07-28 09:11:56.808295+00
66666666-6666-6666-6666-666666666611	\N	\N	\N	\N	\N	2026-07-28 09:30:16.365868+00	2026-07-28 09:30:16.365868+00
\.


--
-- Data for Name: gl_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.gl_entries (id, company_id, posting_date, posting_datetime, account_id, party_type, party_id, cost_center_id, project_id, currency, exchange_rate, debit, credit, debit_in_account_currency, credit_in_account_currency, voucher_type, voucher_no, voucher_id, is_reversal, reversal_source_id, created_at, created_by) FROM stdin;
\.


--
-- Data for Name: heavy_equipment_details; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.heavy_equipment_details (asset_id, equipment_type, operating_weight, capacity, engine_model, hour_meter, certification_number, certification_expiry, created_at, updated_at) FROM stdin;
ad65e6f6-9b65-42f6-a5bb-a8f442379778	\N	\N	\N	\N	\N	\N	\N	2026-07-28 07:19:33.756098+00	2026-07-28 07:19:33.756098+00
3b6ecb6e-e9dd-49b4-b99e-f158a69c32e8	\N	\N	\N	\N	\N	\N	\N	2026-07-28 09:04:48.442639+00	2026-07-28 09:04:48.442639+00
3b241ee4-d374-4217-b303-946da3bf0d00	\N	\N	\N	\N	\N	\N	\N	2026-07-28 09:05:48.134518+00	2026-07-28 09:05:48.134518+00
26e7d22c-9594-432b-b858-545b6a48982f	\N	\N	\N	\N	\N	\N	\N	2026-07-28 09:32:56.198322+00	2026-07-28 09:32:56.198322+00
\.


--
-- Data for Name: id_tax_invoices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.id_tax_invoices (id, company_id, sales_invoice_id, tax_invoice_number, npwp_buyer, name_buyer, tax_base, vat_amount, vat_rate, effective_date, status, created_at) FROM stdin;
\.


--
-- Data for Name: id_withholding_certificates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.id_withholding_certificates (id, company_id, certificate_number, pph_type, vendor_id, client_id, gross_amount, pph_amount, pph_rate, posting_date, status, created_at) FROM stdin;
\.


--
-- Data for Name: idempotency_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.idempotency_log (idempotency_key, actor_id, company_id, source_type, source_id, correlation_id, status, outcome, created_at, completed_at, request_fingerprint) FROM stdin;
\.


--
-- Data for Name: installed_apps; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.installed_apps (app_name, version, required_kernel_version, status, installed_at, updated_at) FROM stdin;
\.


--
-- Data for Name: insurances; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.insurances (id, asset_id, policy_number, insurance_provider, coverage_type, coverage_amount, start_date, end_date, premium_amount, status, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: inventory_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory_categories (id, code, name, description, inventory_account_id, expense_account_id, created_at, updated_at) FROM stdin;
dc9f41d2-d939-4aa2-98b4-4dec71fd9152	CAT-SP	Suku Cadang Mesin	Peralatan dan suku cadang untuk pemeliharaan mesin	00000000-0000-4001-a131-000000000000	00000000-0000-4005-a111-000000000000	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00
9b878fdd-6d2e-4f2b-8b15-e57c4322fd8d	CAT-LB	Pelumas & Kimia	Berbagai jenis oli dan cairan kimia operasional	00000000-0000-4001-a132-000000000000	00000000-0000-4005-a112-000000000000	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00
b114ca6b-2013-4f1b-885f-a7f99a998496	CAT-TR	Ban (Tires)	Persediaan ban untuk armada	00000000-0000-4001-a133-000000000000	00000000-0000-4005-a113-000000000000	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00
\.


--
-- Data for Name: inventory_details; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory_details (asset_id, inventory_type, warranty_expiry, os_license, mac_address, created_at, updated_at) FROM stdin;
66666666-6666-6666-6666-666666666620	\N	\N	\N	\N	2026-07-28 09:02:32.223362+00	2026-07-28 09:02:32.223362+00
66666666-6666-6666-6666-666666666605	\N	\N	\N	\N	2026-07-28 09:07:07.609594+00	2026-07-28 09:07:07.609594+00
66666666-6666-6666-6666-666666666630	\N	\N	\N	\N	2026-07-28 09:15:35.16336+00	2026-07-28 09:15:35.16336+00
66666666-6666-6666-6666-666666666621	\N	\N	\N	\N	2026-07-28 09:17:03.060023+00	2026-07-28 09:17:03.060023+00
66666666-6666-6666-6666-666666666602	\N	\N	\N	\N	2026-07-28 09:18:08.943474+00	2026-07-28 09:18:08.943474+00
66666666-6666-6666-6666-666666666601	\N	\N	\N	\N	2026-07-28 09:24:42.79738+00	2026-07-28 09:24:42.79738+00
\.


--
-- Data for Name: inventory_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory_documents (id, item_id, name, type, file_path, mime_type, size_bytes, expiry_date, notes, uploaded_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: inventory_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory_items (id, category_id, unit_id, sku, name, description, min_stock, max_stock, current_quantity, average_cost, last_purchase_price, is_active, created_at, updated_at, company_id, custom_data) FROM stdin;
4ae5b21f-2ec1-4685-b58b-6a9521682287	dc9f41d2-d939-4aa2-98b4-4dec71fd9152	3	SP-FLT-KM-001	Filter Oli Komatsu PC200	Oil Filter Genuine Komatsu 600-211-1340	10.00	50.00	25.00	150000.00	155000.00	t	2026-07-28 06:53:50.376598+00	2026-07-28 06:53:50.376598+00	\N	{}
389f0d3c-cca5-4344-a897-ba769652b6f0	dc9f41d2-d939-4aa2-98b4-4dec71fd9152	3	SP-FLT-AF-002	Air Filter Outer Sakuda	Air Filter Outer compatible with Hino 500	5.00	20.00	8.00	350000.00	350000.00	t	2026-07-28 06:53:50.376598+00	2026-07-28 06:53:50.376598+00	\N	{}
5a9ed528-3413-429d-ab9e-2255a7bb67e4	dc9f41d2-d939-4aa2-98b4-4dec71fd9152	2	SP-BRK-FR-003	Kampas Rem Depan (Brake Pad)	Brake Pad Set Isuzu Giga	4.00	12.00	10.00	850000.00	850000.00	t	2026-07-28 06:53:50.376598+00	2026-07-28 06:53:50.376598+00	\N	{}
2088fd3c-4e3d-40d3-93eb-235ca26bc8c4	9b878fdd-6d2e-4f2b-8b15-e57c4322fd8d	6	LB-OIL-R4-DRM	Shell Rimula R4X 15W-40 (Drum)	Drum 209 Liter	2.00	10.00	5.00	8500000.00	8750000.00	t	2026-07-28 06:53:50.376598+00	2026-07-28 06:53:50.376598+00	\N	{}
d3cc58d0-f58d-4789-961d-01d222c7ffaf	9b878fdd-6d2e-4f2b-8b15-e57c4322fd8d	5	LB-CLT-PRS-001	Prestone Radiator Coolant	Ready to use, Green, Galon 4L	20.00	100.00	45.00	125000.00	130000.00	t	2026-07-28 06:53:50.376598+00	2026-07-28 06:53:50.376598+00	\N	{}
a3050001-b351-459c-855e-f8808930538e	b114ca6b-2013-4f1b-885f-a7f99a998496	3	TR-BS-1000-20	Bridgestone 10.00-20	Ban Truk - E-Miler	10.00	40.00	12.00	3800000.00	3950000.00	t	2026-07-28 06:53:50.376598+00	2026-07-28 06:53:50.376598+00	\N	{}
2fe46459-6c7a-407d-9394-f6ae3b2300c2	b114ca6b-2013-4f1b-885f-a7f99a998496	3	TR-GT-750-16	GT Radial 7.50-16	Ban Truk Engkel	8.00	24.00	20.00	2100000.00	2200000.00	t	2026-07-28 06:53:50.376598+00	2026-07-28 06:53:50.376598+00	\N	{}
\.


--
-- Data for Name: inventory_movements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory_movements (id, item_id, movement_type, quantity, unit_price, total_value, reference_id, reference_number, notes, created_by, created_at) FROM stdin;
25b8e230-9203-4618-a1ba-358e432ceafd	4ae5b21f-2ec1-4685-b58b-6a9521682287	IN_ADJUSTMENT	25.00	150000.00	3750000.00	\N	OP-INV-2026	Saldo Awal Migrasi	\N	2026-07-28 06:53:50.376598+00
66020b86-34f4-4944-872c-b1529712c1fe	389f0d3c-cca5-4344-a897-ba769652b6f0	IN_ADJUSTMENT	8.00	350000.00	2800000.00	\N	OP-INV-2026	Saldo Awal Migrasi	\N	2026-07-28 06:53:50.376598+00
d98e19eb-61d4-4f00-b831-9f3220a1992c	5a9ed528-3413-429d-ab9e-2255a7bb67e4	IN_ADJUSTMENT	10.00	850000.00	8500000.00	\N	OP-INV-2026	Saldo Awal Migrasi	\N	2026-07-28 06:53:50.376598+00
bc61d653-2717-42b8-8a4a-7f86d7a6df7c	2088fd3c-4e3d-40d3-93eb-235ca26bc8c4	IN_ADJUSTMENT	5.00	8500000.00	42500000.00	\N	OP-INV-2026	Saldo Awal Migrasi	\N	2026-07-28 06:53:50.376598+00
2422d235-ba1d-44e2-b833-2143451c9abd	d3cc58d0-f58d-4789-961d-01d222c7ffaf	IN_ADJUSTMENT	45.00	125000.00	5625000.00	\N	OP-INV-2026	Saldo Awal Migrasi	\N	2026-07-28 06:53:50.376598+00
b5879298-cb92-4a28-b5e2-859fac81cb13	a3050001-b351-459c-855e-f8808930538e	IN_ADJUSTMENT	12.00	3800000.00	45600000.00	\N	OP-INV-2026	Saldo Awal Migrasi	\N	2026-07-28 06:53:50.376598+00
1a14d31c-01b7-4b42-88b0-cc116bb4026e	2fe46459-6c7a-407d-9394-f6ae3b2300c2	IN_ADJUSTMENT	20.00	2100000.00	42000000.00	\N	OP-INV-2026	Saldo Awal Migrasi	\N	2026-07-28 06:53:50.376598+00
\.


--
-- Data for Name: journal_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.journal_entries (id, transaction_number, date, description, reference, status, created_by, created_at, updated_at) FROM stdin;
00000000-0000-400b-b001-000000000001	OP-20260101	2026-01-01	Saldo Awal - Setoran Modal Saham	\N	posted	\N	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00
00000000-0000-400b-b001-000000000002	JE-20260105	2026-01-05	Beli MacBook Pro M3 untuk Marketing	\N	posted	\N	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00
00000000-0000-400b-b001-000000000003	INV-20260101	2026-01-10	Rental Crane - Project MRT Jakarta	\N	posted	\N	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00
00000000-0000-400b-b001-000000000004	PAY-202601-25	2026-01-25	Payroll Karyawan Periode Januari	\N	posted	\N	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00
00000000-0000-400b-b001-000000000005	JE-20260128	2026-01-28	Bayar Langganan AWS & Telkom	\N	posted	\N	2026-07-28 06:53:50.201328+00	2026-07-28 06:53:50.201328+00
\.


--
-- Data for Name: journal_lines; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.journal_lines (id, journal_entry_id, account_id, description, debit, credit) FROM stdin;
4b13b8d8-7560-4c92-a243-1d1cfd433ca0	00000000-0000-400b-b001-000000000001	00000000-0000-4001-a112-000000000001	Bank BCA	1000000000.0000	0.0000
10a2c898-99c9-4bf1-ae6b-b8748aa242a6	00000000-0000-400b-b001-000000000001	00000000-0000-4003-a110-000000000001	Modal Disetor	0.0000	1000000000.0000
90385e4d-0362-4d63-8dc2-52fe305138cd	00000000-0000-400b-b001-000000000002	00000000-0000-4001-a230-000000000000	Peralatan Kantor (Laptop)	35000000.0000	0.0000
b40b5709-a46e-43a4-80e7-eeb9bd7cffef	00000000-0000-400b-b001-000000000002	00000000-0000-4001-a112-000000000001	Bayar via Transfer BCA	0.0000	35000000.0000
5779e5bf-14b0-400f-be51-279aa1a9f88c	00000000-0000-400b-b001-000000000003	00000000-0000-4001-a110-000000000000	PPN Keluaran 11%	0.0000	8423423.0000
35c9be53-7a61-4b5c-99f3-8069dede38a9	00000000-0000-400b-b001-000000000003	00000000-0000-4001-a120-000000000000	Tagihan Piutang MRT	85000000.0000	0.0000
171d4405-00a4-4243-b182-cfd8ead616ed	00000000-0000-400b-b001-000000000003	00000000-0000-4004-a120-000000000001	Pendapatan Jasa Rental Crane	0.0000	85000000.0000
972cc84e-cdee-4e4d-817a-ea4c737b995c	00000000-0000-400b-b001-000000000004	00000000-0000-4006-a110-000000000001	Biaya Gaji Karyawan	45000000.0000	0.0000
895959e2-2360-4486-92b8-e6ba2ebcc942	00000000-0000-400b-b001-000000000004	00000000-0000-4001-a112-000000000001	Transfer via BCA Payroll	0.0000	45000000.0000
427c73ff-fd3b-4cce-92b8-507e8c09d305	00000000-0000-400b-b001-000000000005	00000000-0000-4006-a210-000000000001	Biaya Internet & Server	4500000.0000	0.0000
1e19f8a5-3a92-49f8-87ad-e6905c663eb3	00000000-0000-400b-b001-000000000005	00000000-0000-4001-a112-000000000001	Bayar via BCA	0.0000	4500000.0000
\.


--
-- Data for Name: land_details; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.land_details (asset_id, certificate_number, land_area, address, zoning, rights_status, rights_expiry, pbb_number, njop_value, gps_coordinates, boundaries, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: landed_cost_vouchers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.landed_cost_vouchers (id, company_id, voucher_number, posting_date, total_landed_cost, distribute_by, status, created_at, created_by) FROM stdin;
\.


--
-- Data for Name: layout_definitions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.layout_definitions (id, entity_type_id, layout_name, layout_json, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: leads; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.leads (id, company_id, lead_name, organization_name, email, phone, status, created_at) FROM stdin;
\.


--
-- Data for Name: leave_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.leave_requests (id, employee_id, leave_type, start_date, end_date, days_count, reason, status, approved_by, approved_at, rejection_reason, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: locations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.locations (id, parent_id, code, name, type, address, created_at, updated_at, latitude, longitude, capacity, current_count, qr_code, check_in_time, check_out_time, check_in_tolerance, check_out_tolerance, radius) FROM stdin;
33333333-3333-3333-3333-333333333301	\N	GEDUNG-A	Gedung A	Building	\N	2026-07-28 06:53:48.524635+00	2026-07-28 06:53:48.524635+00	\N	\N	\N	0	\N	08:00:00	17:00:00	30	15	50
33333333-3333-3333-3333-333333333302	\N	GEDUNG-B	Gedung B	Building	\N	2026-07-28 06:53:48.524635+00	2026-07-28 06:53:48.524635+00	\N	\N	\N	0	\N	08:00:00	17:00:00	30	15	50
33333333-3333-3333-3333-333333333311	33333333-3333-3333-3333-333333333301	A-LT1	Gedung A - Lantai 1	Floor	\N	2026-07-28 06:53:48.524635+00	2026-07-28 06:53:48.524635+00	\N	\N	\N	0	\N	08:00:00	17:00:00	30	15	50
33333333-3333-3333-3333-333333333312	33333333-3333-3333-3333-333333333301	A-LT2	Gedung A - Lantai 2	Floor	\N	2026-07-28 06:53:48.524635+00	2026-07-28 06:53:48.524635+00	\N	\N	\N	0	\N	08:00:00	17:00:00	30	15	50
33333333-3333-3333-3333-333333333313	33333333-3333-3333-3333-333333333301	A-LT3	Gedung A - Lantai 3	Floor	\N	2026-07-28 06:53:48.524635+00	2026-07-28 06:53:48.524635+00	\N	\N	\N	0	\N	08:00:00	17:00:00	30	15	50
33333333-3333-3333-3333-333333333321	33333333-3333-3333-3333-333333333311	A-101	Ruang Server	Room	\N	2026-07-28 06:53:48.524635+00	2026-07-28 06:53:48.524635+00	\N	\N	\N	0	\N	08:00:00	17:00:00	30	15	50
33333333-3333-3333-3333-333333333322	33333333-3333-3333-3333-333333333311	A-102	Ruang IT	Room	\N	2026-07-28 06:53:48.524635+00	2026-07-28 06:53:48.524635+00	\N	\N	\N	0	\N	08:00:00	17:00:00	30	15	50
33333333-3333-3333-3333-333333333323	33333333-3333-3333-3333-333333333312	A-201	Ruang Meeting	Room	\N	2026-07-28 06:53:48.524635+00	2026-07-28 06:53:48.524635+00	\N	\N	\N	0	\N	08:00:00	17:00:00	30	15	50
33333333-3333-3333-3333-333333333324	33333333-3333-3333-3333-333333333312	A-202	Ruang Manager	Room	\N	2026-07-28 06:53:48.524635+00	2026-07-28 06:53:48.524635+00	\N	\N	\N	0	\N	08:00:00	17:00:00	30	15	50
\.


--
-- Data for Name: machine_details; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.machine_details (asset_id, machine_type, technical_specs, installation_year, operating_hours, energy_source, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: maintenance_checklists; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.maintenance_checklists (id, work_order_id, task_number, description, instructions, expected_result, status, completed_by, completed_at, actual_result, verified_by, verified_at, verification_notes, photos, readings, created_at) FROM stdin;
\.


--
-- Data for Name: maintenance_records; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.maintenance_records (id, asset_id, maintenance_type_id, scheduled_date, actual_date, description, findings, actions_taken, cost, currency_id, performed_by, vendor_id, status, next_service_date, odometer_reading, created_by, created_at, updated_at, assigned_to, approval_status, cost_threshold_exceeded) FROM stdin;
\.


--
-- Data for Name: maintenance_schedules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.maintenance_schedules (id, asset_id, title, description, interval_type, interval_value, interval_unit, is_active, last_run_date, last_run_reading, next_run_date, next_run_reading, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: maintenance_template_tasks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.maintenance_template_tasks (id, template_id, task_number, description, instructions, expected_result, created_at) FROM stdin;
\.


--
-- Data for Name: maintenance_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.maintenance_templates (id, name, description, asset_category_id, created_at, updated_at, version, is_active, parent_id, usage_count, last_used_at) FROM stdin;
\.


--
-- Data for Name: maintenance_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.maintenance_types (id, code, name, is_preventive) FROM stdin;
1	ROUTINE	Pemeliharaan Rutin	t
2	REPAIR	Perbaikan	f
3	OVERHAUL	Overhaul	f
4	INSPECTION	Inspeksi	t
9	ADMIN	Administrasi (KIR/STNK/Pajak)	t
\.


--
-- Data for Name: maintenance_work_order_parts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.maintenance_work_order_parts (id, work_order_id, part_name, quantity, unit_cost, total_cost, added_at, created_at, updated_at, expense_type, inventory_item_id) FROM stdin;
\.


--
-- Data for Name: maintenance_work_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.maintenance_work_orders (id, wo_number, asset_id, wo_type, priority, status, scheduled_date, due_date, actual_start_date, actual_end_date, assigned_technician, vendor_id, estimated_hours, actual_hours, estimated_cost, actual_cost, parts_cost, labor_cost, problem_description, work_performed, recommendations, safety_requirements, lockout_tagout_required, completion_notes, customer_signoff, technician_signoff, created_by, approved_by, completed_by, created_at, updated_at, location_id, target_category_id, target_specifications, conversion_notes, conversion_type, labor_expense_type, expense_id, opex_expense_id, capex_expense_id, supervisor_signoff, company_id, custom_data) FROM stdin;
88888888-8888-8888-8888-888888888801	WO-20240107-001	66666666-6666-6666-6666-666666666620	corrective	high	in_progress	2024-01-07	2024-01-10	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Screen tidak menyala, perlu penggantian	\N	\N	\N	f	\N	\N	\N	00000000-0000-0000-0000-000000000002	\N	\N	2026-07-28 06:53:48.524635+00	2026-07-28 06:53:48.524635+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}
88888888-8888-8888-8888-888888888802	WO-20240110-001	66666666-6666-6666-6666-666666666603	preventive	medium	pending	2024-01-15	2024-01-20	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Scheduled quarterly maintenance	\N	\N	\N	f	\N	\N	\N	00000000-0000-0000-0000-000000000002	\N	\N	2026-07-28 06:53:48.524635+00	2026-07-28 06:53:48.524635+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}
\.


--
-- Data for Name: naming_series; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.naming_series (entity_type, company_id, prefix, year, last_counter) FROM stdin;
\.


--
-- Data for Name: notification_preferences; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notification_preferences (id, user_id, template_id, event_type, email_enabled, push_enabled, sms_enabled, in_app_enabled, digest_frequency, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: notification_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notification_templates (id, code, name, subject_template, body_template, channels, event_type, is_active, created_at, updated_at) FROM stdin;
7b3da0d8-3fa1-4e3f-804e-5e5d2d211a4f	loan_requested	Loan Requested	New Loan Request: {{asset_name}}	A loan request has been submitted for {{asset_name}} by {{borrower_name}}. Expected return: {{return_date}}	{in_app,email}	loan.requested	t	2026-07-28 06:53:48.492183+00	2026-07-28 06:53:48.492183+00
caa9f17a-7a86-422c-b1d7-75ca914e4cbd	loan_approved	Loan Approved	Loan Approved: {{asset_name}}	Your loan request for {{asset_name}} has been approved. Please pick up the asset.	{in_app,email,push}	loan.approved	t	2026-07-28 06:53:48.492183+00	2026-07-28 06:53:48.492183+00
39484fe5-e825-46f6-8095-b2d766734333	loan_overdue	Loan Overdue	OVERDUE: {{asset_name}}	Your loan for {{asset_name}} is {{days_overdue}} days overdue. Please return immediately.	{in_app,email,push,sms}	loan.overdue	t	2026-07-28 06:53:48.492183+00	2026-07-28 06:53:48.492183+00
946c546f-f85d-42cb-8660-94cf235a5863	maintenance_due	Maintenance Due	Maintenance Due: {{asset_name}}	Scheduled maintenance for {{asset_name}} is due on {{due_date}}.	{in_app,email}	maintenance.due	t	2026-07-28 06:53:48.492183+00	2026-07-28 06:53:48.492183+00
69cd6d93-77db-4bf0-b0ac-adf12aec4b6d	work_order_assigned	Work Order Assigned	Work Order Assigned: {{wo_number}}	You have been assigned work order {{wo_number}} for {{asset_name}}.	{in_app,email,push}	workorder.assigned	t	2026-07-28 06:53:48.492183+00	2026-07-28 06:53:48.492183+00
92353810-7f82-49da-9d0f-e948f06dd96b	sensor_alert	Sensor Alert	ALERT: {{asset_name}} - {{sensor_type}}	{{severity}} alert for {{asset_name}}: {{sensor_type}} reading {{value}} exceeds threshold {{threshold}}.	{in_app,email,push,sms}	sensor.alert	t	2026-07-28 06:53:48.492183+00	2026-07-28 06:53:48.492183+00
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, template_id, title, message, data, channel, entity_type, entity_id, is_read, read_at, is_sent, sent_at, created_at) FROM stdin;
\.


--
-- Data for Name: opening_balance_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.opening_balance_items (id, voucher_id, account_id, warehouse_id, item_id, qty, unit_cost, amount) FROM stdin;
\.


--
-- Data for Name: opening_balance_vouchers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.opening_balance_vouchers (id, company_id, voucher_type, cutover_date, total_amount, source_system, status, created_by, posted_at) FROM stdin;
\.


--
-- Data for Name: opportunities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.opportunities (id, company_id, lead_id, title, estimated_value, stage, expected_closing_date, created_at) FROM stdin;
\.


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.organizations (id, code, name, parent_id, org_type, cost_center, budget, manager_id, is_active, metadata, created_at, updated_at) FROM stdin;
11111111-1111-1111-1111-111111111111	HQ	Headquarters	\N	company	\N	\N	\N	t	\N	2026-07-28 06:53:48.524635+00	2026-07-28 06:53:48.524635+00
\.


--
-- Data for Name: outbox; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.outbox (id, event_type, payload, source_type, source_id, tenant_id, company_id, correlation_id, status, attempt_count, max_attempts, next_attempt_at, created_at, last_error, completed_at) FROM stdin;
\.


--
-- Data for Name: payroll_slips; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payroll_slips (id, company_id, employee_id, period_start, period_end, gross_salary, total_deductions, net_salary, status, created_at) FROM stdin;
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.permissions (id, code, name, description, resource, action, created_at) FROM stdin;
a70b19b6-b661-4a47-bc8b-987e1ec876d9	asset.transfer	Transfer Asset	\N	asset	transfer	2026-07-28 06:53:48.322287+00
263bdfc8-0016-4c68-a821-ad3949fe312c	asset.dispose	Dispose Asset	\N	asset	dispose	2026-07-28 06:53:48.322287+00
3ae995d1-d080-4bf4-8661-767e24c1693d	maintenance.approve	Approve Maintenance	\N	maintenance	approve	2026-07-28 06:53:48.322287+00
53dd03eb-20c2-455a-838e-7dfdf2cd3af0	loan.request	Request Loan	\N	loan	request	2026-07-28 06:53:48.322287+00
301aad2e-f0d0-46ff-b523-c260ddea1365	loan.approve	Approve Loan	\N	loan	approve	2026-07-28 06:53:48.322287+00
838fc684-469e-4df6-9887-b9d9cec6489d	loan.checkout	Checkout Loan	\N	loan	checkout	2026-07-28 06:53:48.322287+00
4e33bc96-9626-403e-a57a-3a0a7a7be7e9	loan.checkin	Checkin Loan	\N	loan	checkin	2026-07-28 06:53:48.322287+00
290702de-8da9-4bfe-abd3-e1e8bf8ac9f9	report.view	View Reports	\N	report	read	2026-07-28 06:53:48.322287+00
6b6baef2-aeab-4450-85b1-bed49d9c7e91	report.export	Export Reports	\N	report	export	2026-07-28 06:53:48.322287+00
fb157a7e-a09e-4269-b708-8adf23087442	heavy_eq.create	Create Heavy Equipment	\N	heavy_equipment	create	2026-07-28 06:53:48.675848+00
7f0bc36f-e771-4fbf-9005-f034a2645090	heavy_eq.read	Read Heavy Equipment	\N	heavy_equipment	read	2026-07-28 06:53:48.675848+00
4a705f3b-ca12-4c1e-b66e-09452bc7c6c8	heavy_eq.update	Update Heavy Equipment	\N	heavy_equipment	update	2026-07-28 06:53:48.675848+00
81049f1f-7261-46e6-abf6-44f286c386c3	work_order.read_all	Read All Work Orders	\N	work_order	read_all	2026-07-28 06:53:48.71845+00
bc7ad595-24e8-4d98-85d0-b6a0150e912a	work_order.approve_cost	Approve Work Order Cost	\N	work_order	approve_cost	2026-07-28 06:53:48.71845+00
e34d71b6-cefa-4ab6-93b7-f399ad54f09d	work_order.assign	Assign Technician	\N	work_order	assign	2026-07-28 06:53:48.71845+00
f17552b4-12c8-4208-ba0a-525ea6b6e539	dashboard.read	Dashboard Read	Permission for Dashboard Read	dashboard	read	2026-08-01 02:45:01.724788+00
656dc5a3-918f-489f-a28b-57927cd9585f	dashboard.create	Dashboard Create	Permission for Dashboard Create	dashboard	create	2026-08-01 02:45:01.724788+00
73156f3b-961c-4309-acdf-9b3a84be22cb	dashboard.update	Dashboard Update	Permission for Dashboard Update	dashboard	update	2026-08-01 02:45:01.724788+00
7b72784e-d243-48c7-b818-bcab2aeeba72	dashboard.delete	Dashboard Delete	Permission for Dashboard Delete	dashboard	delete	2026-08-01 02:45:01.724788+00
3f93e074-fe6a-4dbe-9cc6-9b814ace1aa5	analytics.read	Analytics Read	Permission for Analytics Read	analytics	read	2026-08-01 02:45:01.724788+00
931baf31-ac24-48ec-b8ee-5e32fa7ad1a3	analytics.create	Analytics Create	Permission for Analytics Create	analytics	create	2026-08-01 02:45:01.724788+00
814c7c4d-a516-4c7a-9add-bb48df5fe886	analytics.update	Analytics Update	Permission for Analytics Update	analytics	update	2026-08-01 02:45:01.724788+00
22d85d5a-a800-4a11-b0e7-f99553b4da3c	analytics.delete	Analytics Delete	Permission for Analytics Delete	analytics	delete	2026-08-01 02:45:01.724788+00
ff52831c-b35c-493d-a648-239abe75e20f	report.read	Report Read	Permission for Report Read	report	read	2026-08-01 02:45:01.724788+00
a77d3975-cb4c-4e0a-88a9-3846795c32cd	report.create	Report Create	Permission for Report Create	report	create	2026-08-01 02:45:01.724788+00
197dbbcf-f027-4938-9d21-71ca4dfd123c	report.update	Report Update	Permission for Report Update	report	update	2026-08-01 02:45:01.724788+00
15762573-be44-42e1-a735-8fd88864b50b	report.delete	Report Delete	Permission for Report Delete	report	delete	2026-08-01 02:45:01.724788+00
72d8ffe6-106d-4567-8b43-bad56d4870cd	asset.read	Read Asset	\N	asset	read	2026-07-28 06:53:48.322287+00
189ca001-ed61-447d-8d2e-8d9e329f96fe	asset.create	Create Asset	\N	asset	create	2026-07-28 06:53:48.322287+00
dff45fdd-2d2a-4263-80d4-a628a732a0b8	asset.update	Update Asset	\N	asset	update	2026-07-28 06:53:48.322287+00
0cf9c5ed-bccb-43b2-8d4d-115b039b9324	asset.delete	Delete Asset	\N	asset	delete	2026-07-28 06:53:48.322287+00
1dedd0cb-2518-4169-804b-6f8b83e6a608	asset_lifecycle.read	Asset Lifecycle Read	Permission for Asset Lifecycle Read	asset_lifecycle	read	2026-08-01 02:45:01.724788+00
71153489-7e19-43a1-891c-094eddbc8dcd	asset_lifecycle.create	Asset Lifecycle Create	Permission for Asset Lifecycle Create	asset_lifecycle	create	2026-08-01 02:45:01.724788+00
fb8f35e9-5e03-4439-970f-ef64e39391c9	asset_lifecycle.update	Asset Lifecycle Update	Permission for Asset Lifecycle Update	asset_lifecycle	update	2026-08-01 02:45:01.724788+00
96a5fc31-bbd7-408b-8155-dbcc925e3781	asset_lifecycle.delete	Asset Lifecycle Delete	Permission for Asset Lifecycle Delete	asset_lifecycle	delete	2026-08-01 02:45:01.724788+00
92e5c2d7-a11f-4732-9e0a-b744fd9bbea8	work_order.read	Read Work Order	\N	work_order	read	2026-07-28 06:53:48.71845+00
3ea4607e-cd8c-40cb-ace9-26d19e5a0dcc	finance.read	Finance Read	Permission for Finance Read	finance	read	2026-08-01 02:45:01.724788+00
9f0e44e3-39f3-4893-a56e-6c6d7f9d8a55	categories.read	Categories Read	Permission for Categories Read	categories	read	2026-08-01 02:45:01.724788+00
2c03c6de-37f6-4ac0-8fcc-6e48076edd26	categories.create	Categories Create	Permission for Categories Create	categories	create	2026-08-01 02:45:01.724788+00
341e3665-2b86-4ef2-8e5c-7befd0386ef0	categories.update	Categories Update	Permission for Categories Update	categories	update	2026-08-01 02:45:01.724788+00
6e26f65e-fab2-40df-aaaf-b2e4e197e469	categories.delete	Categories Delete	Permission for Categories Delete	categories	delete	2026-08-01 02:45:01.724788+00
d0b0b6c0-ec39-4081-9082-a5cb7e56a1a3	location.read	Location Read	Permission for Location Read	location	read	2026-08-01 02:45:01.724788+00
09e49302-1764-4031-9ef2-4a00e22afb81	location.create	Location Create	Permission for Location Create	location	create	2026-08-01 02:45:01.724788+00
8fe6c8a5-6737-477d-8a1e-b2aaded3a52c	location.update	Location Update	Permission for Location Update	location	update	2026-08-01 02:45:01.724788+00
d066ba22-028f-4ffa-8924-2da3ce336d89	location.delete	Location Delete	Permission for Location Delete	location	delete	2026-08-01 02:45:01.724788+00
704ef229-1ab0-4e3f-83cb-51888e4f1b04	asset_audit.read	Asset Audit Read	Permission for Asset Audit Read	asset_audit	read	2026-08-01 02:45:01.724788+00
bf494182-9e5d-45af-b68b-f37bc97d2701	asset_audit.create	Asset Audit Create	Permission for Asset Audit Create	asset_audit	create	2026-08-01 02:45:01.724788+00
b3e16d07-430b-49c8-95d5-7d9099c52a78	asset_audit.update	Asset Audit Update	Permission for Asset Audit Update	asset_audit	update	2026-08-01 02:45:01.724788+00
0876fb0c-3d7c-4084-88ee-d6ce2a0aec78	asset_audit.delete	Asset Audit Delete	Permission for Asset Audit Delete	asset_audit	delete	2026-08-01 02:45:01.724788+00
04a1b8cc-a3e3-4bd8-ae2c-2ba21c9dba45	work_order.create	Create Work Order	\N	work_order	create	2026-07-28 06:53:48.71845+00
2821a987-986a-4f31-b21f-80c7521d4041	work_order.update	Update Work Order	\N	work_order	update	2026-07-28 06:53:48.71845+00
5fd4116e-2889-494f-b0ba-248c65051b86	work_order.delete	Delete Work Order	\N	work_order	delete	2026-07-28 06:53:48.71845+00
f8aeac5c-9ff5-4427-a2b9-863bc4e4f2af	conversion.read	Conversion Read	Permission for Conversion Read	conversion	read	2026-08-01 02:45:01.724788+00
4bc21659-0b74-4db4-b5b1-c61d2feb1526	conversion.create	Conversion Create	Permission for Conversion Create	conversion	create	2026-08-01 02:45:01.724788+00
92a642ea-2a36-4756-bf33-a0d384f356de	conversion.update	Conversion Update	Permission for Conversion Update	conversion	update	2026-08-01 02:45:01.724788+00
f60e2f07-8660-418c-a5b3-0f258a69fd58	conversion.delete	Conversion Delete	Permission for Conversion Delete	conversion	delete	2026-08-01 02:45:01.724788+00
385bedfa-b4b3-4998-a7d2-0459850ec7ef	preventive_schedule.read	Read Preventive Schedule	\N	preventive_schedule	read	2026-07-28 06:53:48.71845+00
64517c90-d8c3-4852-9c6e-afa79dc2e586	preventive_schedule.create	Create Preventive Schedule	\N	preventive_schedule	create	2026-07-28 06:53:48.71845+00
6ef3832a-a363-4f45-bbf7-dff9c07f4ba0	preventive_schedule.update	Update Preventive Schedule	\N	preventive_schedule	update	2026-07-28 06:53:48.71845+00
a4fcfad0-11dd-4ca8-b6c0-9feca967b229	preventive_schedule.delete	Delete Preventive Schedule	\N	preventive_schedule	delete	2026-07-28 06:53:48.71845+00
1128ed51-e75b-47ec-91dd-75f24c1b5537	maintenance_template.read	Maintenance Template Read	Permission for Maintenance Template Read	maintenance_template	read	2026-08-01 02:45:01.724788+00
b9242c8f-c7ad-4dcc-a19c-20da1ed094e3	maintenance_template.create	Maintenance Template Create	Permission for Maintenance Template Create	maintenance_template	create	2026-08-01 02:45:01.724788+00
e5763ea9-f6de-401f-82a6-5f76c114f12d	maintenance_template.update	Maintenance Template Update	Permission for Maintenance Template Update	maintenance_template	update	2026-08-01 02:45:01.724788+00
beb4af27-c87f-40b0-bdef-caf87ce4cef9	maintenance_template.delete	Maintenance Template Delete	Permission for Maintenance Template Delete	maintenance_template	delete	2026-08-01 02:45:01.724788+00
c6d60783-1b5b-41a2-8338-7e06a78f5a1c	fuel.read	Fuel Read	Permission for Fuel Read	fuel	read	2026-08-01 02:45:01.724788+00
f9961660-698c-4b5c-880b-bc3ded18c725	fuel.create	Fuel Create	Permission for Fuel Create	fuel	create	2026-08-01 02:45:01.724788+00
ca648b9e-8f56-4970-8f22-23abef6c636a	fuel.update	Fuel Update	Permission for Fuel Update	fuel	update	2026-08-01 02:45:01.724788+00
eed09c5a-050b-4ef3-bb1b-d19c07a194bf	fuel.delete	Fuel Delete	Permission for Fuel Delete	fuel	delete	2026-08-01 02:45:01.724788+00
63ba4e12-034f-43d2-b037-ef1ffaee1349	loan.read	Loan Read	Permission for Loan Read	loan	read	2026-08-01 02:45:01.724788+00
56938cf7-6803-4ea2-8d8b-6a2e1b283c3f	loan.create	Loan Create	Permission for Loan Create	loan	create	2026-08-01 02:45:01.724788+00
df97fc0b-b33a-43e8-956b-3fa999c648ae	loan.update	Loan Update	Permission for Loan Update	loan	update	2026-08-01 02:45:01.724788+00
600e5c88-9bbf-48f5-a2f9-8b8ccf03f786	loan.delete	Loan Delete	Permission for Loan Delete	loan	delete	2026-08-01 02:45:01.724788+00
13c0b3cb-eb7f-489e-bf37-46e28c0a8cc5	tax_document.read	Tax Document Read	Permission for Tax Document Read	tax_document	read	2026-08-01 02:45:01.724788+00
559b211c-0405-4e1f-b697-5e52c19cd66e	tax_document.create	Tax Document Create	Permission for Tax Document Create	tax_document	create	2026-08-01 02:45:01.724788+00
559369db-5892-4771-b494-f13e8a82ff82	tax_document.update	Tax Document Update	Permission for Tax Document Update	tax_document	update	2026-08-01 02:45:01.724788+00
6ac0f0da-e195-46f3-a277-b7a3cb2b8a37	tax_document.delete	Tax Document Delete	Permission for Tax Document Delete	tax_document	delete	2026-08-01 02:45:01.724788+00
2efdaae7-6f3c-4cf6-8c5d-21db8d03b2c1	rental.read	Rental Read	Permission for Rental Read	rental	read	2026-08-01 02:45:01.724788+00
f29b22ae-2330-4627-9614-3635dcbe1467	rental.create	Rental Create	Permission for Rental Create	rental	create	2026-08-01 02:45:01.724788+00
906a102e-caa0-4d14-bd87-527395be1188	rental.update	Rental Update	Permission for Rental Update	rental	update	2026-08-01 02:45:01.724788+00
8d6bbc7f-3aed-4e12-9bd4-11fc0a05e2e1	rental.delete	Rental Delete	Permission for Rental Delete	rental	delete	2026-08-01 02:45:01.724788+00
88962f95-c5fa-48ff-ab64-a96cc6e6fa6c	contract.read	Contract Read	Permission for Contract Read	contract	read	2026-08-01 02:45:01.724788+00
d058529f-b6b7-4257-92b9-d875e4f5d3af	contract.create	Contract Create	Permission for Contract Create	contract	create	2026-08-01 02:45:01.724788+00
a5ead375-cb0a-4e58-883f-6cc49f2b6564	contract.update	Contract Update	Permission for Contract Update	contract	update	2026-08-01 02:45:01.724788+00
33718e3e-3717-437b-b532-aa6894366f70	contract.delete	Contract Delete	Permission for Contract Delete	contract	delete	2026-08-01 02:45:01.724788+00
07fb2f6a-6cfd-4153-b193-8d1c7b130b35	contract_template.read	Contract Template Read	Permission for Contract Template Read	contract_template	read	2026-08-01 02:45:01.724788+00
576dbbe1-3727-418b-9cd4-98e5dad58ce3	contract_template.create	Contract Template Create	Permission for Contract Template Create	contract_template	create	2026-08-01 02:45:01.724788+00
8425f638-2370-42f4-b89a-8c486924614a	contract_template.update	Contract Template Update	Permission for Contract Template Update	contract_template	update	2026-08-01 02:45:01.724788+00
58d71626-b760-4268-a6da-02ffd4559510	contract_template.delete	Contract Template Delete	Permission for Contract Template Delete	contract_template	delete	2026-08-01 02:45:01.724788+00
84aa0d85-51ce-4927-aa1e-ddbf3a9ac864	client.read	Client Read	Permission for Client Read	client	read	2026-08-01 02:45:01.724788+00
e7eee7d5-4e5e-46b9-8be1-e64b4bba6da5	client.create	Client Create	Permission for Client Create	client	create	2026-08-01 02:45:01.724788+00
c3520fbd-6c45-49bc-97bc-8b7a0bc9c522	client.update	Client Update	Permission for Client Update	client	update	2026-08-01 02:45:01.724788+00
f4c7feb2-9bb6-4a74-8d0c-05f1f747bd44	client.delete	Client Delete	Permission for Client Delete	client	delete	2026-08-01 02:45:01.724788+00
2e51ca70-5510-46c7-93ec-557a75b4cc45	sales_invoice.read	Sales Invoice Read	Permission for Sales Invoice Read	sales_invoice	read	2026-08-01 02:45:01.724788+00
d1313ed4-810a-4eb2-b12c-32907b46b11c	sales_invoice.create	Sales Invoice Create	Permission for Sales Invoice Create	sales_invoice	create	2026-08-01 02:45:01.724788+00
e831d912-67f3-477b-9014-246dcf7bb76f	sales_invoice.update	Sales Invoice Update	Permission for Sales Invoice Update	sales_invoice	update	2026-08-01 02:45:01.724788+00
04f65ed0-46ea-49f7-970a-33c76d8fc371	sales_invoice.delete	Sales Invoice Delete	Permission for Sales Invoice Delete	sales_invoice	delete	2026-08-01 02:45:01.724788+00
cb001e58-924a-4041-b5e9-256871de6e75	inventory.read	Inventory Read	Permission for Inventory Read	inventory	read	2026-08-01 02:45:01.724788+00
5625e30f-2608-49f6-b5ca-7e9de6b383c6	inventory.create	Inventory Create	Permission for Inventory Create	inventory	create	2026-08-01 02:45:01.724788+00
99a7dc2b-094b-478c-8202-5f90b4ad84fc	inventory.update	Inventory Update	Permission for Inventory Update	inventory	update	2026-08-01 02:45:01.724788+00
45baced1-93f7-42d8-b477-05152ec31db5	inventory.delete	Inventory Delete	Permission for Inventory Delete	inventory	delete	2026-08-01 02:45:01.724788+00
1c0edfa9-d4c6-4db4-93eb-584ae8a48d93	inventory_category.read	Inventory Category Read	Permission for Inventory Category Read	inventory_category	read	2026-08-01 02:45:01.724788+00
f8f7790c-8634-41d7-9350-b1d3858c94a9	inventory_category.create	Inventory Category Create	Permission for Inventory Category Create	inventory_category	create	2026-08-01 02:45:01.724788+00
b2b26610-6a39-4f7f-bd6a-9d598c5db59f	inventory_category.update	Inventory Category Update	Permission for Inventory Category Update	inventory_category	update	2026-08-01 02:45:01.724788+00
a0212c03-1608-46e8-8539-5950880e67bc	inventory_category.delete	Inventory Category Delete	Permission for Inventory Category Delete	inventory_category	delete	2026-08-01 02:45:01.724788+00
29daebe4-a4ca-465c-9a74-c2b2e7579b77	stock_opname.read	Stock Opname Read	Permission for Stock Opname Read	stock_opname	read	2026-08-01 02:45:01.724788+00
a1c58c76-36af-47b5-9723-84ab9de3336d	stock_opname.create	Stock Opname Create	Permission for Stock Opname Create	stock_opname	create	2026-08-01 02:45:01.724788+00
964de934-570c-49ff-a55b-ce802e77da29	stock_opname.update	Stock Opname Update	Permission for Stock Opname Update	stock_opname	update	2026-08-01 02:45:01.724788+00
27249132-b7de-4753-8662-047fad9f67ae	stock_opname.delete	Stock Opname Delete	Permission for Stock Opname Delete	stock_opname	delete	2026-08-01 02:45:01.724788+00
6e83ea28-052b-4de3-bafe-030f8231a8f7	purchase_bill.read	Purchase Bill Read	Permission for Purchase Bill Read	purchase_bill	read	2026-08-01 02:45:01.724788+00
6682877d-63d3-40b9-82d5-55b4943a6e63	purchase_bill.create	Purchase Bill Create	Permission for Purchase Bill Create	purchase_bill	create	2026-08-01 02:45:01.724788+00
d0db0899-27f2-4f1d-b9da-b8f37b6271a3	purchase_bill.update	Purchase Bill Update	Permission for Purchase Bill Update	purchase_bill	update	2026-08-01 02:45:01.724788+00
cb7cd9bc-ad3d-4841-831f-7d62958c752c	purchase_bill.delete	Purchase Bill Delete	Permission for Purchase Bill Delete	purchase_bill	delete	2026-08-01 02:45:01.724788+00
419781eb-57a5-4d24-b067-917f783d32c3	finance.create	Finance Create	Permission for Finance Create	finance	create	2026-08-01 02:45:01.724788+00
4231727b-5d12-46e3-aa04-1d0cb59b303c	finance.update	Finance Update	Permission for Finance Update	finance	update	2026-08-01 02:45:01.724788+00
9b1c87c3-2157-4567-a0b5-c0bb37bff394	finance.delete	Finance Delete	Permission for Finance Delete	finance	delete	2026-08-01 02:45:01.724788+00
d0197075-ca87-4cc7-8ee9-6817f244a082	cash_bank.read	Cash Bank Read	Permission for Cash Bank Read	cash_bank	read	2026-08-01 02:45:01.724788+00
17f17ba8-ed2f-472f-b26c-ee239a97eadf	cash_bank.create	Cash Bank Create	Permission for Cash Bank Create	cash_bank	create	2026-08-01 02:45:01.724788+00
b9289cb7-f4cd-4e56-8aca-e5c79b430516	cash_bank.update	Cash Bank Update	Permission for Cash Bank Update	cash_bank	update	2026-08-01 02:45:01.724788+00
778c9398-c015-4815-8d33-f950137e50cd	cash_bank.delete	Cash Bank Delete	Permission for Cash Bank Delete	cash_bank	delete	2026-08-01 02:45:01.724788+00
4867828f-0e09-46b3-b2c2-21b062f8e381	expense.read	Expense Read	Permission for Expense Read	expense	read	2026-08-01 02:45:01.724788+00
298e7517-1619-4fa3-9834-a034c712e0c0	expense.create	Expense Create	Permission for Expense Create	expense	create	2026-08-01 02:45:01.724788+00
4895470c-e895-4a21-83ec-eed22c1533dc	expense.update	Expense Update	Permission for Expense Update	expense	update	2026-08-01 02:45:01.724788+00
a5f86164-0a78-4017-b513-f7a3b4a3b5f9	expense.delete	Expense Delete	Permission for Expense Delete	expense	delete	2026-08-01 02:45:01.724788+00
cc76e6c0-33aa-42c6-9f92-7a1848a33fa5	journal.read	Journal Read	Permission for Journal Read	journal	read	2026-08-01 02:45:01.724788+00
e42dcb64-9bfe-49b0-8aee-61fc652e6aff	journal.create	Journal Create	Permission for Journal Create	journal	create	2026-08-01 02:45:01.724788+00
5b5a310c-8b57-45be-9802-90b70afbe9fe	journal.update	Journal Update	Permission for Journal Update	journal	update	2026-08-01 02:45:01.724788+00
c0669d86-d504-4b30-afe8-4ca941876cea	journal.delete	Journal Delete	Permission for Journal Delete	journal	delete	2026-08-01 02:45:01.724788+00
be0c5df1-db2c-42f3-9416-c9854286aff3	financial_report.read	Financial Report Read	Permission for Financial Report Read	financial_report	read	2026-08-01 02:45:01.724788+00
34d79f15-1925-415e-812b-0253d984ad31	financial_report.create	Financial Report Create	Permission for Financial Report Create	financial_report	create	2026-08-01 02:45:01.724788+00
f6dd7936-4bed-4745-9c69-217c9bd55d76	financial_report.update	Financial Report Update	Permission for Financial Report Update	financial_report	update	2026-08-01 02:45:01.724788+00
ed234038-87d3-4210-ae3d-12c8e77621b5	financial_report.delete	Financial Report Delete	Permission for Financial Report Delete	financial_report	delete	2026-08-01 02:45:01.724788+00
2e17c3ea-795e-49a5-bae6-5e321bc3a406	employee.read	Employee Read	Permission for Employee Read	employee	read	2026-08-01 02:45:01.724788+00
5a7d902e-3538-422b-824f-caffe107965d	employee.create	Employee Create	Permission for Employee Create	employee	create	2026-08-01 02:45:01.724788+00
92d8e149-d089-4bee-9bf1-a669081956b3	employee.update	Employee Update	Permission for Employee Update	employee	update	2026-08-01 02:45:01.724788+00
28f949b0-450e-4fb9-877a-9c04c14e34e5	employee.delete	Employee Delete	Permission for Employee Delete	employee	delete	2026-08-01 02:45:01.724788+00
948a102c-ab7f-4937-8caf-3c104204eac5	department.read	Department Read	Permission for Department Read	department	read	2026-08-01 02:45:01.724788+00
ed9b63f7-ee4a-42b4-9f48-b41b16cd3f40	department.create	Department Create	Permission for Department Create	department	create	2026-08-01 02:45:01.724788+00
3197cb5d-3998-45bc-8ede-d2c9b689287b	department.update	Department Update	Permission for Department Update	department	update	2026-08-01 02:45:01.724788+00
afd199d4-48cf-4260-ac3f-c43341ed6352	department.delete	Department Delete	Permission for Department Delete	department	delete	2026-08-01 02:45:01.724788+00
b47fa648-cc67-43a8-8208-7ec53b94d7cc	attendance.read	Attendance Read	Permission for Attendance Read	attendance	read	2026-08-01 02:45:01.724788+00
c20d17e0-2272-4921-86c5-2fa84f5da67d	attendance.create	Attendance Create	Permission for Attendance Create	attendance	create	2026-08-01 02:45:01.724788+00
6a43ecd7-f653-4e29-a780-b9e24e530c55	attendance.update	Attendance Update	Permission for Attendance Update	attendance	update	2026-08-01 02:45:01.724788+00
59d1bc5d-3570-43b3-a0f4-c8f64229b4d9	attendance.delete	Attendance Delete	Permission for Attendance Delete	attendance	delete	2026-08-01 02:45:01.724788+00
8dd58348-d8e4-4917-a0a7-8ce27ea4e671	leave.read	Leave Read	Permission for Leave Read	leave	read	2026-08-01 02:45:01.724788+00
286e1622-4cbf-4191-90be-2f7878d28339	leave.create	Leave Create	Permission for Leave Create	leave	create	2026-08-01 02:45:01.724788+00
12664612-65a3-4c2c-883a-2e98b8e29cde	leave.update	Leave Update	Permission for Leave Update	leave	update	2026-08-01 02:45:01.724788+00
3e909628-3bf1-4da2-8d2e-1091e6972492	leave.delete	Leave Delete	Permission for Leave Delete	leave	delete	2026-08-01 02:45:01.724788+00
a32db735-8163-46e1-8113-88fa98fb773a	approval_center.read	Approval Center Read	Permission for Approval Center Read	approval_center	read	2026-08-01 02:45:01.724788+00
a1f47716-2767-4a15-8266-24c1801d071e	approval_center.create	Approval Center Create	Permission for Approval Center Create	approval_center	create	2026-08-01 02:45:01.724788+00
24123f37-86fd-44c1-a88e-876bc608eb24	approval_center.update	Approval Center Update	Permission for Approval Center Update	approval_center	update	2026-08-01 02:45:01.724788+00
2cda3484-d460-4c98-ad11-09cce749fdda	approval_center.delete	Approval Center Delete	Permission for Approval Center Delete	approval_center	delete	2026-08-01 02:45:01.724788+00
d878a9b4-6ff5-484c-b254-fa6c1961d34c	user.read	Read User	\N	user	read	2026-07-28 06:53:48.322287+00
5c3e895b-cf12-4378-aa33-3b71421519a4	user.create	Create User	\N	user	create	2026-07-28 06:53:48.322287+00
8b29c28a-b992-46ab-807d-9b73801f2a3e	user.update	Update User	\N	user	update	2026-07-28 06:53:48.322287+00
97ee4b3e-b645-499e-983f-7ed010a40938	user.delete	Delete User	\N	user	delete	2026-07-28 06:53:48.322287+00
43649095-c265-4b59-baab-5f0055aa8296	role.read	Role Read	Permission for Role Read	role	read	2026-08-01 02:45:01.724788+00
50e744bd-70ff-4357-b533-ae5fb79d6347	role.create	Role Create	Permission for Role Create	role	create	2026-08-01 02:45:01.724788+00
26150732-2112-407d-b8a7-c19968546931	role.update	Role Update	Permission for Role Update	role	update	2026-08-01 02:45:01.724788+00
9d055598-f457-41c0-93ae-eae435377a70	role.delete	Role Delete	Permission for Role Delete	role	delete	2026-08-01 02:45:01.724788+00
888aa989-d77c-4bd4-b639-2df34fcbaab8	approval_workflow.read	Approval Workflow Read	Permission for Approval Workflow Read	approval_workflow	read	2026-08-01 02:45:01.724788+00
c55f79bd-154c-45c9-8e55-132a024f7e56	approval_workflow.create	Approval Workflow Create	Permission for Approval Workflow Create	approval_workflow	create	2026-08-01 02:45:01.724788+00
99d2afc8-986a-43eb-ab6f-9544c4d618e5	approval_workflow.update	Approval Workflow Update	Permission for Approval Workflow Update	approval_workflow	update	2026-08-01 02:45:01.724788+00
e9806934-7c59-4967-bf94-82ebcfc8eb9b	approval_workflow.delete	Approval Workflow Delete	Permission for Approval Workflow Delete	approval_workflow	delete	2026-08-01 02:45:01.724788+00
4ca54c40-1ad4-42b6-afc9-e72f5d9fcf56	audit_log.read	Audit Log Read	Permission for Audit Log Read	audit_log	read	2026-08-01 02:45:01.724788+00
040ce3b4-5d79-4b08-9834-59bb1d951d5e	audit_log.create	Audit Log Create	Permission for Audit Log Create	audit_log	create	2026-08-01 02:45:01.724788+00
da8f698c-c830-4172-b9db-6a717d0326dc	audit_log.update	Audit Log Update	Permission for Audit Log Update	audit_log	update	2026-08-01 02:45:01.724788+00
4dbaa380-6be9-4c1f-a5c5-57eb2caab8da	audit_log.delete	Audit Log Delete	Permission for Audit Log Delete	audit_log	delete	2026-08-01 02:45:01.724788+00
cae198f8-111a-4e22-8b22-08f00fb21af8	settings.read	Settings Read	Permission for Settings Read	settings	read	2026-08-01 02:45:01.724788+00
e36a7282-47dc-497e-a700-235d99404cd5	settings.create	Settings Create	Permission for Settings Create	settings	create	2026-08-01 02:45:01.724788+00
7a94aed0-c338-44aa-8ab0-a6494fda6b71	settings.update	Settings Update	Permission for Settings Update	settings	update	2026-08-01 02:45:01.724788+00
754c8177-4237-414b-ae7b-d175440f78da	settings.delete	Settings Delete	Permission for Settings Delete	settings	delete	2026-08-01 02:45:01.724788+00
4344b037-7632-48eb-901b-1d56a49760f8	profile.read	Profile Read	Permission for Profile Read	profile	read	2026-08-01 02:45:01.724788+00
6f5b0d88-48e9-46e7-acd3-7bdf68f9cbbe	profile.create	Profile Create	Permission for Profile Create	profile	create	2026-08-01 02:45:01.724788+00
75658e0a-b44e-4f4f-afad-20872f133870	profile.update	Profile Update	Permission for Profile Update	profile	update	2026-08-01 02:45:01.724788+00
a81ef8bc-ca30-45f8-af96-b30cbbbb96cf	profile.delete	Profile Delete	Permission for Profile Delete	profile	delete	2026-08-01 02:45:01.724788+00
2ffba4b0-0703-4025-8515-23ecb532c965	heavy_equipment.read	Heavy Equipment Read	Permission for Heavy Equipment Read	heavy_equipment	read	2026-08-01 02:45:01.724788+00
239e0e29-2c6b-45db-93eb-fa056fc7dd05	heavy_equipment.create	Heavy Equipment Create	Permission for Heavy Equipment Create	heavy_equipment	create	2026-08-01 02:45:01.724788+00
0b6decbd-763d-4e5c-9e84-6e59c8ff9e36	heavy_equipment.update	Heavy Equipment Update	Permission for Heavy Equipment Update	heavy_equipment	update	2026-08-01 02:45:01.724788+00
3abda261-e145-4792-9592-098802aad5f3	heavy_equipment.delete	Heavy Equipment Delete	Permission for Heavy Equipment Delete	heavy_equipment	delete	2026-08-01 02:45:01.724788+00
d77f4da8-ca5b-43c0-8528-ad5640bbce98	infra.read	Read Infrastructure	\N	infra	read	2026-07-28 06:53:48.675848+00
35a7c6fe-a95d-47c0-b9aa-5401199121d8	infra.create	Create Infrastructure	\N	infra	create	2026-07-28 06:53:48.675848+00
a334d74b-ad42-4246-b14d-2277f8e8c879	infra.update	Update Infrastructure	\N	infra	update	2026-07-28 06:53:48.675848+00
b84c98ad-0556-48cf-87bf-13d275230d7e	infra.delete	Infra Delete	Permission for Infra Delete	infra	delete	2026-08-01 02:45:01.724788+00
aa0ea6f9-f9c3-47ef-a5e0-85787e60c231	vehicle.read	Read Vehicle	\N	vehicle	read	2026-07-28 06:53:48.675848+00
375728d0-aded-4e11-8b74-c3ef31fce643	vehicle.create	Create Vehicle	\N	vehicle	create	2026-07-28 06:53:48.675848+00
71c71f2f-45f7-41ab-b25c-9f940f5d7331	vehicle.update	Update Vehicle	\N	vehicle	update	2026-07-28 06:53:48.675848+00
f0d74dc7-0aed-42a6-ad11-d41918d9a44e	vehicle.delete	Vehicle Delete	Permission for Vehicle Delete	vehicle	delete	2026-08-01 02:45:01.724788+00
cf917983-481b-4690-88c0-7dbfa8869c3d	maintenance.read	Read Maintenance	\N	maintenance	read	2026-07-28 06:53:48.322287+00
0ddc8171-4e27-47c4-b979-a9410cf8feee	maintenance.create	Create Maintenance	\N	maintenance	create	2026-07-28 06:53:48.322287+00
abbf002f-856f-405f-b0a9-ac2b50dbcd97	maintenance.update	Update Maintenance	\N	maintenance	update	2026-07-28 06:53:48.322287+00
92574a0a-b007-44b8-9381-6abda3c18a5e	maintenance.delete	Delete Maintenance	\N	maintenance	delete	2026-07-28 06:53:48.322287+00
\.


--
-- Data for Name: pos_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pos_profiles (id, company_id, profile_name, warehouse_id, cash_account_id, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: pos_shifts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pos_shifts (id, pos_profile_id, cashier_user_id, opening_balance, closing_balance, status, opened_at, closed_at) FROM stdin;
\.


--
-- Data for Name: preventive_schedules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.preventive_schedules (id, asset_id, maintenance_type_id, name, interval_type, interval_value, last_execution_date, last_execution_odometer, next_due_date, next_due_odometer, is_active, notification_days_before, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: print_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.print_templates (id, entity_type_id, document_type, template_name, html_template, css_styles, is_default, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: production_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.production_orders (id, company_id, production_order_number, bom_id, item_id, target_qty, produced_qty, warehouse_id, status, wip_account_id, created_at) FROM stdin;
\.


--
-- Data for Name: project_tasks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.project_tasks (id, project_id, task_name, status, estimated_hours, created_at) FROM stdin;
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.projects (id, company_id, project_code, project_name, cost_center_id, status, budget_amount, created_at) FROM stdin;
\.


--
-- Data for Name: purchase_bill_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.purchase_bill_items (id, bill_id, description, quantity, unit_price, total_price, account_id, source_type, source_id, source_line_id) FROM stdin;
\.


--
-- Data for Name: purchase_bills; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.purchase_bills (id, bill_number, vendor_id, date, due_date, subject, subtotal, tax, total_amount, amount_paid, status, created_by, journal_entry_id, created_at, updated_at, attachment_url, budget_type, company_id, custom_data) FROM stdin;
\.


--
-- Data for Name: purchase_order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.purchase_order_items (id, purchase_order_id, description, quantity, unit_price, amount) FROM stdin;
\.


--
-- Data for Name: purchase_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.purchase_orders (id, order_number, purchase_quote_id, vendor_id, date, delivery_date, subject, subtotal, tax, total_amount, status, created_at, updated_at, budget_type) FROM stdin;
\.


--
-- Data for Name: purchase_quote_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.purchase_quote_items (id, purchase_quote_id, description, quantity, unit_price, amount) FROM stdin;
\.


--
-- Data for Name: purchase_quotes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.purchase_quotes (id, quote_number, vendor_id, date, expiry_date, subject, subtotal, tax, total_amount, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: purchase_receipt_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.purchase_receipt_items (id, receipt_id, item_id, qty_received, unit_cost, total_amount, po_line_id, batch_no, serial_no) FROM stdin;
\.


--
-- Data for Name: purchase_receipts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.purchase_receipts (id, company_id, receipt_number, purchase_order_id, vendor_id, warehouse_id, posting_date, status, notes, created_at, created_by) FROM stdin;
\.


--
-- Data for Name: purchase_shipment_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.purchase_shipment_items (id, purchase_shipment_id, description, quantity_received, source_type, source_id, source_line_id) FROM stdin;
\.


--
-- Data for Name: purchase_shipments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.purchase_shipments (id, shipment_number, purchase_order_id, vendor_id, date, courier_name, tracking_number, notes, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: quality_inspection_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.quality_inspection_templates (id, company_id, template_name, item_id, created_at) FROM stdin;
\.


--
-- Data for Name: quality_inspections; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.quality_inspections (id, company_id, inspection_number, inspection_type, item_id, batch_no, sample_size, status, inspected_by, created_at) FROM stdin;
\.


--
-- Data for Name: rental_billing_periods; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rental_billing_periods (id, rental_id, period_start, period_end, period_type, total_operating_hours, total_standby_hours, total_overtime_hours, total_breakdown_hours, total_hm_km_usage, working_days, rate_basis, hourly_rate, minimum_hours, overtime_multiplier, standby_multiplier, breakdown_penalty_per_day, billable_hours, shortfall_hours, base_amount, standby_amount, overtime_amount, breakdown_penalty_amount, mobilization_fee, demobilization_fee, other_charges, other_charges_description, subtotal, discount_percentage, discount_amount, tax_percentage, tax_amount, total_amount, status, invoice_number, invoice_date, due_date, calculated_by, calculated_at, approved_by, approved_at, notes, created_at, updated_at, total_production_volume, unit_rate, mechanical_availability, physical_availability, utilization_availability, effective_utilization, ma_threshold, availability_penalty, adjustment_notes, adjusted_by, adjusted_at, rental_item_id, total_fuel_consumed, fuel_surcharge_rate, fuel_surcharge_amount) FROM stdin;
\.


--
-- Data for Name: rental_billings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rental_billings (id, rental_id, period_start, period_end, period_type, total_operating_hours, total_standby_hours, total_overtime_hours, total_breakdown_hours, total_hm_km_usage, working_days, rate_basis, hourly_rate, minimum_hours, overtime_multiplier, standby_multiplier, breakdown_penalty_per_day, billable_hours, shortfall_hours, base_amount, standby_amount, overtime_amount, breakdown_penalty_amount, mobilization_fee, demobilization_fee, other_charges, other_charges_description, subtotal, discount_percentage, discount_amount, tax_percentage, tax_amount, total_amount, status, invoice_number, invoice_date, due_date, calculated_by, calculated_at, approved_by, approved_at, notes, created_at, updated_at, total_production_volume, unit_rate, mechanical_availability, physical_availability, utilization_availability, effective_utilization, ma_threshold, availability_penalty, adjustment_notes, adjusted_by, adjusted_at, rental_item_id) FROM stdin;
\.


--
-- Data for Name: rental_contracts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rental_contracts (id, contract_number, client_id, start_date, end_date, auto_renew, renewal_notice_days, payment_terms, price_lock, status, total_timesheets, total_operating_hours, total_standby_hours, total_breakdown_hours, mechanical_availability, physical_availability, utilization_availability, effective_utilization, kpi_calculated_at, contract_file_url, notes, created_at, created_by, updated_at, updated_by, approved_at, approved_by, terminated_at, terminated_by, termination_reason, submitted_for_approval_at, delegated_to, current_approval_step, total_approval_steps, template_id, company_id) FROM stdin;
\.


--
-- Data for Name: rental_details; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rental_details (asset_id, rate_per_hour, rate_per_day, rate_per_month, minimum_rental_period, operator_required, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: rental_handovers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rental_handovers (id, rental_id, handover_type, condition_rating, condition_notes, photos, has_damage, damage_description, damage_photos, recorded_by, recorded_at, signature_data, created_at, rental_item_id) FROM stdin;
\.


--
-- Data for Name: rental_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rental_items (id, rental_id, asset_id, rental_rate_id, rate_amount, rate_basis, status, start_date, expected_end_date, actual_end_date, dispatched_by, dispatched_at, returned_by, returned_at, subtotal, penalty_amount, notes, created_at, updated_at, mob_demob_cost, is_fuel_included) FROM stdin;
\.


--
-- Data for Name: rental_rates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rental_rates (id, name, category_id, asset_id, rate_type, rate_amount, currency, minimum_duration, deposit_percentage, late_fee_per_day, is_active, created_at, updated_at, rate_basis, minimum_hours, overtime_multiplier, standby_multiplier, breakdown_penalty_per_day, hours_per_day, days_per_month, ma_threshold, availability_penalty_multiplier, fuel_surcharge_rate, tier_config) FROM stdin;
\.


--
-- Data for Name: rental_timesheets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rental_timesheets (id, rental_id, work_date, start_time, end_time, operating_hours, standby_hours, overtime_hours, breakdown_hours, hm_km_start, hm_km_end, hm_km_usage, operation_status, breakdown_reason, work_description, work_location, photos, checker_id, checker_at, checker_notes, verifier_id, verifier_at, verifier_status, verifier_notes, client_pic_id, client_approved_at, client_signature, client_notes, status, created_at, updated_at, production_volume, production_unit, standby_start_time, standby_end_time, breakdown_start_time, breakdown_end_time, rental_item_id, fuel_consumed_liters) FROM stdin;
\.


--
-- Data for Name: rentals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rentals (id, rental_number, client_id, status, request_date, start_date, expected_end_date, actual_end_date, subtotal, deposit_amount, deposit_returned, penalty_amount, total_amount, requested_by, approved_by, approved_at, rejection_reason, agreement_document, invoice_number, notes, created_at, updated_at, contract_id) FROM stdin;
\.


--
-- Data for Name: report_access_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.report_access_log (id, report_id, definition_id, user_id, action, ip_address, accessed_at) FROM stdin;
\.


--
-- Data for Name: report_definitions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.report_definitions (id, code, name, description, report_type, output_format, query_template, parameters, layout_config, is_public, organization_id, created_by, is_active, created_at, updated_at) FROM stdin;
65db12b8-03a5-4b4e-add6-4916762b3072	asset_inventory	Asset Inventory Report	Complete inventory of all assets with current values	asset	pdf	\N	{"status": {"type": "string", "required": false}, "category_id": {"type": "uuid", "required": false}, "location_id": {"type": "uuid", "required": false}}	\N	f	\N	\N	t	2026-07-28 06:53:48.461373+00	2026-07-28 06:53:48.461373+00
12f93894-4ac1-4799-a694-c3c6d1390480	asset_depreciation	Asset Depreciation Report	Depreciation schedule for all assets	depreciation	pdf	\N	{"as_of_date": {"type": "date", "default": "today", "required": true}, "category_id": {"type": "uuid", "required": false}}	\N	f	\N	\N	t	2026-07-28 06:53:48.461373+00	2026-07-28 06:53:48.461373+00
d175d036-7c48-406e-aa07-685fb5db527f	maintenance_summary	Maintenance Summary Report	Summary of maintenance activities and costs	maintenance	pdf	\N	{"asset_id": {"type": "uuid", "required": false}, "end_date": {"type": "date", "required": true}, "start_date": {"type": "date", "required": true}}	\N	f	\N	\N	t	2026-07-28 06:53:48.461373+00	2026-07-28 06:53:48.461373+00
954ff144-aa76-4984-bea3-1502d35d40ac	loan_status	Loan Status Report	Current status of all asset loans	loan	pdf	\N	{"overdue_only": {"type": "boolean", "default": false}, "include_returned": {"type": "boolean", "default": false}}	\N	f	\N	\N	t	2026-07-28 06:53:48.461373+00	2026-07-28 06:53:48.461373+00
395a179a-b8a9-4dd0-89a1-0db6533322d7	asset_lifecycle	Asset Lifecycle Report	Asset status changes and lifecycle events	asset	pdf	\N	{"asset_id": {"type": "uuid", "required": false}, "end_date": {"type": "date", "required": true}, "start_date": {"type": "date", "required": true}}	\N	f	\N	\N	t	2026-07-28 06:53:48.461373+00	2026-07-28 06:53:48.461373+00
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.role_permissions (id, role_id, permission_id, created_at) FROM stdin;
3df1b416-9125-45a6-bc3a-caaefcf4f97c	50d08bae-e000-45cd-b908-3025a0243555	a32db735-8163-46e1-8113-88fa98fb773a	2026-08-01 08:07:13.977576+00
92feebdb-1497-4de3-9b7f-d1885fad1015	50d08bae-e000-45cd-b908-3025a0243555	a1f47716-2767-4a15-8266-24c1801d071e	2026-08-01 08:07:13.977576+00
974508b9-9ccb-4e14-a880-2c82cb850a94	50d08bae-e000-45cd-b908-3025a0243555	24123f37-86fd-44c1-a88e-876bc608eb24	2026-08-01 08:07:13.977576+00
a006c8e2-2b56-4a83-a0c0-561f795792da	50d08bae-e000-45cd-b908-3025a0243555	2cda3484-d460-4c98-ad11-09cce749fdda	2026-08-01 08:07:13.977576+00
9483d567-3f22-44de-90ea-7e1681922999	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	a32db735-8163-46e1-8113-88fa98fb773a	2026-08-01 08:07:13.977576+00
c18bf716-0011-44b9-87a1-45d5d0188d5e	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	a1f47716-2767-4a15-8266-24c1801d071e	2026-08-01 08:07:13.977576+00
2e0c0c3f-eda2-46a2-a913-77bca103fecd	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	24123f37-86fd-44c1-a88e-876bc608eb24	2026-08-01 08:07:13.977576+00
dae67d43-2bd7-41b3-a6cc-5eabf21ece69	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	2cda3484-d460-4c98-ad11-09cce749fdda	2026-08-01 08:07:13.977576+00
8bf3f48e-32bd-4254-986d-6febd65c6e2a	a6fc26df-ac04-42e3-901a-379d60b0e2b2	a32db735-8163-46e1-8113-88fa98fb773a	2026-08-01 08:07:13.977576+00
ed65f59b-9237-4331-9830-e101ddbf00fb	a6fc26df-ac04-42e3-901a-379d60b0e2b2	a1f47716-2767-4a15-8266-24c1801d071e	2026-08-01 08:07:13.977576+00
ea2dec5f-bffd-474e-a145-4243ce6485ab	a6fc26df-ac04-42e3-901a-379d60b0e2b2	24123f37-86fd-44c1-a88e-876bc608eb24	2026-08-01 08:07:13.977576+00
c25fd405-6e11-4803-90ac-776964f2e5bf	a6fc26df-ac04-42e3-901a-379d60b0e2b2	2cda3484-d460-4c98-ad11-09cce749fdda	2026-08-01 08:07:13.977576+00
3c9545ec-1f28-4d84-b02f-d4e5134b2df9	d089540e-0927-4f6f-82f0-251ab7ada2ab	a32db735-8163-46e1-8113-88fa98fb773a	2026-08-01 08:07:13.977576+00
53360ef5-3885-462e-89ce-27684673915d	d089540e-0927-4f6f-82f0-251ab7ada2ab	a1f47716-2767-4a15-8266-24c1801d071e	2026-08-01 08:07:13.977576+00
35764cbc-782e-441f-89b9-16fedad78049	d089540e-0927-4f6f-82f0-251ab7ada2ab	24123f37-86fd-44c1-a88e-876bc608eb24	2026-08-01 08:07:13.977576+00
4206a3e4-0a53-4b8d-bfdb-912181dba277	d089540e-0927-4f6f-82f0-251ab7ada2ab	2cda3484-d460-4c98-ad11-09cce749fdda	2026-08-01 08:07:13.977576+00
82d76e9c-526b-4bad-a7fb-09f4a59ac74d	2ecd1ce9-9227-48d0-9872-5038df943714	a32db735-8163-46e1-8113-88fa98fb773a	2026-08-01 08:07:13.977576+00
abe04918-4572-4980-8573-3e1fe90fa987	2ecd1ce9-9227-48d0-9872-5038df943714	a1f47716-2767-4a15-8266-24c1801d071e	2026-08-01 08:07:13.977576+00
cb55a6e5-9be8-4bdf-a714-27860495a074	2ecd1ce9-9227-48d0-9872-5038df943714	24123f37-86fd-44c1-a88e-876bc608eb24	2026-08-01 08:07:13.977576+00
11885bfe-08f3-45b0-85f9-d91f468da7b5	2ecd1ce9-9227-48d0-9872-5038df943714	2cda3484-d460-4c98-ad11-09cce749fdda	2026-08-01 08:07:13.977576+00
6a6a3ba9-237e-4b22-979b-e0937759e75b	0022d4ed-c891-4301-8ea1-1b73b51f93ac	a32db735-8163-46e1-8113-88fa98fb773a	2026-08-01 08:07:13.977576+00
afe78bed-dc9e-4653-930f-1e5fe0b900a6	0022d4ed-c891-4301-8ea1-1b73b51f93ac	a1f47716-2767-4a15-8266-24c1801d071e	2026-08-01 08:07:13.977576+00
1b0bfcdc-9589-49d8-b40d-6da508a69d01	0022d4ed-c891-4301-8ea1-1b73b51f93ac	24123f37-86fd-44c1-a88e-876bc608eb24	2026-08-01 08:07:13.977576+00
66b30bad-6b84-4767-b3b4-6e7f7fa3a6c5	0022d4ed-c891-4301-8ea1-1b73b51f93ac	2cda3484-d460-4c98-ad11-09cce749fdda	2026-08-01 08:07:13.977576+00
7da3aa45-7cba-4dcb-8c56-5b3edbe6403e	20998ca7-c4cd-4bba-b629-0a6232ff1a9b	a32db735-8163-46e1-8113-88fa98fb773a	2026-08-01 08:07:13.977576+00
ad63cbc8-577d-4db3-bd99-39da3c4d4fb1	20998ca7-c4cd-4bba-b629-0a6232ff1a9b	a1f47716-2767-4a15-8266-24c1801d071e	2026-08-01 08:07:13.977576+00
661ae01f-b139-4bd7-b14d-3553e8d1bcbb	20998ca7-c4cd-4bba-b629-0a6232ff1a9b	24123f37-86fd-44c1-a88e-876bc608eb24	2026-08-01 08:07:13.977576+00
fd13e1c6-9423-472a-a5c4-21e4112588f7	20998ca7-c4cd-4bba-b629-0a6232ff1a9b	2cda3484-d460-4c98-ad11-09cce749fdda	2026-08-01 08:07:13.977576+00
378277c1-757b-4599-a481-801bb5e0bd32	a8803ecd-1f18-4bd9-99f5-e4333f6b9ff4	a32db735-8163-46e1-8113-88fa98fb773a	2026-08-01 08:07:13.977576+00
d348220e-3e51-475e-aaa9-a22d10dc1f52	a8803ecd-1f18-4bd9-99f5-e4333f6b9ff4	a1f47716-2767-4a15-8266-24c1801d071e	2026-08-01 08:07:13.977576+00
64b3b0db-fcc4-45ea-b019-eba76fd6cf8c	a8803ecd-1f18-4bd9-99f5-e4333f6b9ff4	24123f37-86fd-44c1-a88e-876bc608eb24	2026-08-01 08:07:13.977576+00
c11e0556-9185-4d26-a91f-88e767957e65	a8803ecd-1f18-4bd9-99f5-e4333f6b9ff4	2cda3484-d460-4c98-ad11-09cce749fdda	2026-08-01 08:07:13.977576+00
687b6452-94dc-43c7-b754-d14dca6f07d5	09af3987-c52e-40f6-8e5e-a7228a9b170f	a32db735-8163-46e1-8113-88fa98fb773a	2026-08-01 08:07:13.977576+00
558775e2-d265-4c73-bc83-5d44ffc9f53a	09af3987-c52e-40f6-8e5e-a7228a9b170f	a1f47716-2767-4a15-8266-24c1801d071e	2026-08-01 08:07:13.977576+00
2915bba9-6045-4d2d-81fe-0f9c4d6cb9f0	09af3987-c52e-40f6-8e5e-a7228a9b170f	24123f37-86fd-44c1-a88e-876bc608eb24	2026-08-01 08:07:13.977576+00
c845f694-396d-4631-bdd0-f8337f51defd	09af3987-c52e-40f6-8e5e-a7228a9b170f	2cda3484-d460-4c98-ad11-09cce749fdda	2026-08-01 08:07:13.977576+00
cc125933-72c4-4a11-ae66-6fc98e894121	22675626-c0f9-49f6-8b75-ffb049e717fd	a32db735-8163-46e1-8113-88fa98fb773a	2026-08-01 08:07:13.977576+00
f3b9bf27-0a32-47ae-bfef-4120dc436fa7	22675626-c0f9-49f6-8b75-ffb049e717fd	a1f47716-2767-4a15-8266-24c1801d071e	2026-08-01 08:07:13.977576+00
42fb2474-0ae5-486b-9c33-2d95cc25fcc4	22675626-c0f9-49f6-8b75-ffb049e717fd	24123f37-86fd-44c1-a88e-876bc608eb24	2026-08-01 08:07:13.977576+00
d2a93a7e-133d-49f5-a71a-9bc5c55935fd	22675626-c0f9-49f6-8b75-ffb049e717fd	2cda3484-d460-4c98-ad11-09cce749fdda	2026-08-01 08:07:13.977576+00
2f9a4dc6-a1c8-4b25-874b-44413a5ba750	67159545-870a-46dc-8dc7-a983e742b30b	a32db735-8163-46e1-8113-88fa98fb773a	2026-08-01 08:07:13.977576+00
bc403db4-5fa3-4c37-8d87-67d9e7dbf020	67159545-870a-46dc-8dc7-a983e742b30b	a1f47716-2767-4a15-8266-24c1801d071e	2026-08-01 08:07:13.977576+00
eb815e42-7a01-44ad-99c8-daef5fca89bc	67159545-870a-46dc-8dc7-a983e742b30b	24123f37-86fd-44c1-a88e-876bc608eb24	2026-08-01 08:07:13.977576+00
6e3f8b50-b0b0-46c8-80a7-b29ef833bba9	67159545-870a-46dc-8dc7-a983e742b30b	2cda3484-d460-4c98-ad11-09cce749fdda	2026-08-01 08:07:13.977576+00
0d1cd936-3225-4193-b359-5184df88c4c7	2ecd1ce9-9227-48d0-9872-5038df943714	a70b19b6-b661-4a47-bc8b-987e1ec876d9	2026-08-01 08:02:53.67323+00
08cc5ad0-eee5-4e21-afb3-aa1b3fc9304b	0022d4ed-c891-4301-8ea1-1b73b51f93ac	81049f1f-7261-46e6-abf6-44f286c386c3	2026-08-01 08:02:53.680458+00
d0104deb-16b1-4ba5-bf93-021c21b38fa5	0022d4ed-c891-4301-8ea1-1b73b51f93ac	bc7ad595-24e8-4d98-85d0-b6a0150e912a	2026-08-01 08:02:53.680458+00
7e3a06dd-3d99-4f6f-a5aa-11279d306422	2ecd1ce9-9227-48d0-9872-5038df943714	263bdfc8-0016-4c68-a821-ad3949fe312c	2026-08-01 08:02:53.67323+00
e76676fe-dffc-4f94-bbd8-d633b761c97c	d089540e-0927-4f6f-82f0-251ab7ada2ab	72d8ffe6-106d-4567-8b43-bad56d4870cd	2026-08-01 08:02:53.6833+00
5bf6bf4e-fd5a-45b6-9c6a-5d06214042ea	2ecd1ce9-9227-48d0-9872-5038df943714	3ae995d1-d080-4bf4-8661-767e24c1693d	2026-08-01 08:02:53.67323+00
e2d4e969-f4b1-4e58-87d1-d41ad923d314	d089540e-0927-4f6f-82f0-251ab7ada2ab	189ca001-ed61-447d-8d2e-8d9e329f96fe	2026-08-01 08:02:53.6833+00
c5ebcbd9-4f64-4061-a3e0-dcb497462b74	0022d4ed-c891-4301-8ea1-1b73b51f93ac	e34d71b6-cefa-4ab6-93b7-f399ad54f09d	2026-08-01 08:02:53.680458+00
afb756c9-97b9-4405-93ca-522379629ca5	2ecd1ce9-9227-48d0-9872-5038df943714	53dd03eb-20c2-455a-838e-7dfdf2cd3af0	2026-08-01 08:02:53.67323+00
e9bda2ca-8ac2-49c9-9045-bd13691733d4	d089540e-0927-4f6f-82f0-251ab7ada2ab	dff45fdd-2d2a-4263-80d4-a628a732a0b8	2026-08-01 08:02:53.6833+00
27b81e12-6194-441b-a36e-00ef09fe76bd	0022d4ed-c891-4301-8ea1-1b73b51f93ac	72d8ffe6-106d-4567-8b43-bad56d4870cd	2026-08-01 08:02:53.680458+00
2c4bc40c-394f-4a94-8a45-6a8b9bf5dea3	2ecd1ce9-9227-48d0-9872-5038df943714	301aad2e-f0d0-46ff-b523-c260ddea1365	2026-08-01 08:02:53.67323+00
05b4c52c-3b35-4f60-8df3-93bc7405f53b	d089540e-0927-4f6f-82f0-251ab7ada2ab	cb001e58-924a-4041-b5e9-256871de6e75	2026-08-01 08:02:53.6833+00
5e555241-7994-405e-a142-80984d0ea9c7	0022d4ed-c891-4301-8ea1-1b73b51f93ac	189ca001-ed61-447d-8d2e-8d9e329f96fe	2026-08-01 08:02:53.680458+00
64af65a3-ae26-4cec-8a8f-7fd0d48af154	2ecd1ce9-9227-48d0-9872-5038df943714	838fc684-469e-4df6-9887-b9d9cec6489d	2026-08-01 08:02:53.67323+00
2131d3c3-e761-437d-9509-6e18f6f12790	50d08bae-e000-45cd-b908-3025a0243555	a70b19b6-b661-4a47-bc8b-987e1ec876d9	2026-08-01 08:02:53.703414+00
dbe1179d-dccb-4f96-94f8-39e6b15fdc28	0022d4ed-c891-4301-8ea1-1b73b51f93ac	dff45fdd-2d2a-4263-80d4-a628a732a0b8	2026-08-01 08:02:53.680458+00
b3cb5121-8e7d-466b-a83b-0de143cb1e75	2ecd1ce9-9227-48d0-9872-5038df943714	4e33bc96-9626-403e-a57a-3a0a7a7be7e9	2026-08-01 08:02:53.67323+00
58ec06bc-26a0-4494-a706-12dcc7b49d2b	0022d4ed-c891-4301-8ea1-1b73b51f93ac	0cf9c5ed-bccb-43b2-8d4d-115b039b9324	2026-08-01 08:02:53.680458+00
9e440533-401d-4392-b5c6-12951ffa8472	50d08bae-e000-45cd-b908-3025a0243555	263bdfc8-0016-4c68-a821-ad3949fe312c	2026-08-01 08:02:53.703414+00
8b6fad4d-f0c6-4bef-a18a-ed1d1e782c5e	a6fc26df-ac04-42e3-901a-379d60b0e2b2	a70b19b6-b661-4a47-bc8b-987e1ec876d9	2026-08-01 08:02:53.71899+00
9ae97fb6-3523-4cce-875c-f73248cf9264	2ecd1ce9-9227-48d0-9872-5038df943714	290702de-8da9-4bfe-abd3-e1e8bf8ac9f9	2026-08-01 08:02:53.67323+00
a1d29a02-8f7c-41cb-b995-268caf1ec46e	50d08bae-e000-45cd-b908-3025a0243555	3ae995d1-d080-4bf4-8661-767e24c1693d	2026-08-01 08:02:53.703414+00
93da222a-1350-49b1-9125-bedf6b845368	50d08bae-e000-45cd-b908-3025a0243555	fb157a7e-a09e-4269-b708-8adf23087442	2026-08-01 08:02:53.703414+00
7ce7e81a-4f6c-4494-ad32-fdb8f0249d79	50d08bae-e000-45cd-b908-3025a0243555	7f0bc36f-e771-4fbf-9005-f034a2645090	2026-08-01 08:02:53.703414+00
a0cf5601-1722-4cd9-90a1-a564771af9e8	50d08bae-e000-45cd-b908-3025a0243555	4a705f3b-ca12-4c1e-b66e-09452bc7c6c8	2026-08-01 08:02:53.703414+00
e57658c8-1306-4076-b627-a9ded1ef48f0	50d08bae-e000-45cd-b908-3025a0243555	81049f1f-7261-46e6-abf6-44f286c386c3	2026-08-01 08:02:53.703414+00
961c67df-71a9-461c-a942-fbeb99dffd8c	50d08bae-e000-45cd-b908-3025a0243555	bc7ad595-24e8-4d98-85d0-b6a0150e912a	2026-08-01 08:02:53.703414+00
014a52c2-39d7-4cf4-ac15-68dac502eba3	50d08bae-e000-45cd-b908-3025a0243555	e34d71b6-cefa-4ab6-93b7-f399ad54f09d	2026-08-01 08:02:53.703414+00
8ebc71f7-5440-4291-9e8f-be77c1de6f49	50d08bae-e000-45cd-b908-3025a0243555	72d8ffe6-106d-4567-8b43-bad56d4870cd	2026-08-01 08:02:53.703414+00
22e86a4c-9aef-4b89-bee4-9489488ff8d2	50d08bae-e000-45cd-b908-3025a0243555	189ca001-ed61-447d-8d2e-8d9e329f96fe	2026-08-01 08:02:53.703414+00
9e3b78c5-f73e-40a0-8ee3-8dc3d6c49fbf	50d08bae-e000-45cd-b908-3025a0243555	dff45fdd-2d2a-4263-80d4-a628a732a0b8	2026-08-01 08:02:53.703414+00
a54bb01d-04ad-47aa-96c6-498e8243959f	50d08bae-e000-45cd-b908-3025a0243555	0cf9c5ed-bccb-43b2-8d4d-115b039b9324	2026-08-01 08:02:53.703414+00
69a3350b-9674-40cc-8bb3-6f04e39422a3	50d08bae-e000-45cd-b908-3025a0243555	92e5c2d7-a11f-4732-9e0a-b744fd9bbea8	2026-08-01 08:02:53.703414+00
e3d1bebf-39d9-4428-8161-22520baabe35	50d08bae-e000-45cd-b908-3025a0243555	9f0e44e3-39f3-4893-a56e-6c6d7f9d8a55	2026-08-01 08:02:53.703414+00
c72c13d4-6a5f-4b0c-b43e-9cc983638122	50d08bae-e000-45cd-b908-3025a0243555	2c03c6de-37f6-4ac0-8fcc-6e48076edd26	2026-08-01 08:02:53.703414+00
ebb3066c-47de-49d7-8546-1b83bbba25cf	50d08bae-e000-45cd-b908-3025a0243555	341e3665-2b86-4ef2-8e5c-7befd0386ef0	2026-08-01 08:02:53.703414+00
6b8281c9-bfd7-4f94-8ae6-81f83cd36ff5	50d08bae-e000-45cd-b908-3025a0243555	6e26f65e-fab2-40df-aaaf-b2e4e197e469	2026-08-01 08:02:53.703414+00
e724d2df-fa89-4761-973b-792bd9f91aa8	50d08bae-e000-45cd-b908-3025a0243555	09e49302-1764-4031-9ef2-4a00e22afb81	2026-08-01 08:02:53.703414+00
25421845-fa6b-4df6-850a-fc68c35ffe70	50d08bae-e000-45cd-b908-3025a0243555	8fe6c8a5-6737-477d-8a1e-b2aaded3a52c	2026-08-01 08:02:53.703414+00
32e53cbe-4799-4779-9ca3-a9558c3e2ec4	50d08bae-e000-45cd-b908-3025a0243555	d066ba22-028f-4ffa-8924-2da3ce336d89	2026-08-01 08:02:53.703414+00
fe7cb646-a87a-4331-a192-547de1581850	50d08bae-e000-45cd-b908-3025a0243555	04a1b8cc-a3e3-4bd8-ae2c-2ba21c9dba45	2026-08-01 08:02:53.703414+00
c6469246-915d-475a-ad2f-48f907b4a4ca	50d08bae-e000-45cd-b908-3025a0243555	2821a987-986a-4f31-b21f-80c7521d4041	2026-08-01 08:02:53.703414+00
73e08b98-f4f2-49ff-90fb-d15521560384	50d08bae-e000-45cd-b908-3025a0243555	5fd4116e-2889-494f-b0ba-248c65051b86	2026-08-01 08:02:53.703414+00
342c4217-9750-47a9-9ddc-d0b94006dd07	50d08bae-e000-45cd-b908-3025a0243555	385bedfa-b4b3-4998-a7d2-0459850ec7ef	2026-08-01 08:02:53.703414+00
33b027b5-1a0f-4f50-ae9f-1b3eaa40a9b7	50d08bae-e000-45cd-b908-3025a0243555	64517c90-d8c3-4852-9c6e-afa79dc2e586	2026-08-01 08:02:53.703414+00
107a40b7-69fe-40b8-838b-c6df0acc2f28	50d08bae-e000-45cd-b908-3025a0243555	6ef3832a-a363-4f45-bbf7-dff9c07f4ba0	2026-08-01 08:02:53.703414+00
a8ee6d60-ae20-46d4-895b-462e0d043112	50d08bae-e000-45cd-b908-3025a0243555	a4fcfad0-11dd-4ca8-b6c0-9feca967b229	2026-08-01 08:02:53.703414+00
331f075f-6b19-44ea-8df0-31dbff8f8ff1	50d08bae-e000-45cd-b908-3025a0243555	c6d60783-1b5b-41a2-8338-7e06a78f5a1c	2026-08-01 08:02:53.703414+00
14ffb07f-ff82-4790-a299-a598239b0ccb	50d08bae-e000-45cd-b908-3025a0243555	f9961660-698c-4b5c-880b-bc3ded18c725	2026-08-01 08:02:53.703414+00
31dd35d5-2e8e-4b10-aa52-aba816d40ca6	50d08bae-e000-45cd-b908-3025a0243555	ca648b9e-8f56-4970-8f22-23abef6c636a	2026-08-01 08:02:53.703414+00
2a6c37f7-9bf3-4a7f-9c9e-b8deac3ff5e9	50d08bae-e000-45cd-b908-3025a0243555	eed09c5a-050b-4ef3-bb1b-d19c07a194bf	2026-08-01 08:02:53.703414+00
cd776b59-d119-4c62-90a8-92684571bff7	50d08bae-e000-45cd-b908-3025a0243555	13c0b3cb-eb7f-489e-bf37-46e28c0a8cc5	2026-08-01 08:02:53.703414+00
ca771279-b2f5-4a46-a366-25fab1d2590b	50d08bae-e000-45cd-b908-3025a0243555	559b211c-0405-4e1f-b697-5e52c19cd66e	2026-08-01 08:02:53.703414+00
ad5fcb67-f027-423a-a369-0e95cc795d24	50d08bae-e000-45cd-b908-3025a0243555	559369db-5892-4771-b494-f13e8a82ff82	2026-08-01 08:02:53.703414+00
c4c38387-fdc5-4f82-82fc-7abbdcbfd65f	50d08bae-e000-45cd-b908-3025a0243555	6ac0f0da-e195-46f3-a277-b7a3cb2b8a37	2026-08-01 08:02:53.703414+00
46ddc8a4-d827-4346-bfe9-ec5d7093c4be	50d08bae-e000-45cd-b908-3025a0243555	d878a9b4-6ff5-484c-b254-fa6c1961d34c	2026-08-01 08:02:53.703414+00
b8570438-e2fe-4191-8618-db775eaa9a6e	50d08bae-e000-45cd-b908-3025a0243555	2ffba4b0-0703-4025-8515-23ecb532c965	2026-08-01 08:02:53.703414+00
dcc497da-365c-41fe-aee8-06b639762f85	50d08bae-e000-45cd-b908-3025a0243555	239e0e29-2c6b-45db-93eb-fa056fc7dd05	2026-08-01 08:02:53.703414+00
09d0dc93-df64-443c-9b8e-fd0d1a9a1130	50d08bae-e000-45cd-b908-3025a0243555	0b6decbd-763d-4e5c-9e84-6e59c8ff9e36	2026-08-01 08:02:53.703414+00
17cbef88-52c7-4cd7-bc6d-1cba5adf743f	50d08bae-e000-45cd-b908-3025a0243555	3abda261-e145-4792-9592-098802aad5f3	2026-08-01 08:02:53.703414+00
6b2aa1f7-599c-49ff-9668-98dd997dbc69	50d08bae-e000-45cd-b908-3025a0243555	cf917983-481b-4690-88c0-7dbfa8869c3d	2026-08-01 08:02:53.703414+00
1d4d3e58-9f79-483d-a956-094df61bffae	50d08bae-e000-45cd-b908-3025a0243555	0ddc8171-4e27-47c4-b979-a9410cf8feee	2026-08-01 08:02:53.703414+00
8531e461-401d-4785-8775-c7fc70f64875	50d08bae-e000-45cd-b908-3025a0243555	abbf002f-856f-405f-b0a9-ac2b50dbcd97	2026-08-01 08:02:53.703414+00
cd771182-81e4-4478-a1ae-1033aad2eb3b	50d08bae-e000-45cd-b908-3025a0243555	92574a0a-b007-44b8-9381-6abda3c18a5e	2026-08-01 08:02:53.703414+00
87237341-2396-4f14-9923-b35bd23cbe27	50d08bae-e000-45cd-b908-3025a0243555	d0b0b6c0-ec39-4081-9082-a5cb7e56a1a3	2026-08-01 08:02:53.703414+00
825aebfa-5510-460f-964e-28c678012c80	2ecd1ce9-9227-48d0-9872-5038df943714	6b6baef2-aeab-4450-85b1-bed49d9c7e91	2026-08-01 08:02:53.67323+00
780856a4-9f6f-4f53-aeb2-506dfb624fbf	2ecd1ce9-9227-48d0-9872-5038df943714	fb157a7e-a09e-4269-b708-8adf23087442	2026-08-01 08:02:53.67323+00
6dc449b1-f5fe-4a1f-bf83-b21a8817d930	2ecd1ce9-9227-48d0-9872-5038df943714	7f0bc36f-e771-4fbf-9005-f034a2645090	2026-08-01 08:02:53.67323+00
45612672-877c-43f9-ac6b-521ee6a3d37f	2ecd1ce9-9227-48d0-9872-5038df943714	4a705f3b-ca12-4c1e-b66e-09452bc7c6c8	2026-08-01 08:02:53.67323+00
260d7515-82fb-4f2f-b41f-3454955dd5dc	2ecd1ce9-9227-48d0-9872-5038df943714	72d8ffe6-106d-4567-8b43-bad56d4870cd	2026-08-01 08:02:53.67323+00
6c3a59db-8372-4f4a-b9c8-6f8c9c4e1cd7	2ecd1ce9-9227-48d0-9872-5038df943714	189ca001-ed61-447d-8d2e-8d9e329f96fe	2026-08-01 08:02:53.67323+00
beffe28e-c1ce-4f8d-8d74-487a503b9743	2ecd1ce9-9227-48d0-9872-5038df943714	dff45fdd-2d2a-4263-80d4-a628a732a0b8	2026-08-01 08:02:53.67323+00
d09b9098-8fb1-45cc-957b-74a9dc50df79	2ecd1ce9-9227-48d0-9872-5038df943714	0cf9c5ed-bccb-43b2-8d4d-115b039b9324	2026-08-01 08:02:53.67323+00
ee8f5516-2a6b-428b-a447-b7e6a37d2999	2ecd1ce9-9227-48d0-9872-5038df943714	d878a9b4-6ff5-484c-b254-fa6c1961d34c	2026-08-01 08:02:53.67323+00
0f6fefa0-be11-48fa-bae9-8ced232ed1e7	2ecd1ce9-9227-48d0-9872-5038df943714	5c3e895b-cf12-4378-aa33-3b71421519a4	2026-08-01 08:02:53.67323+00
3cf07f20-15e3-40f6-b325-f6bfa2ebe93e	2ecd1ce9-9227-48d0-9872-5038df943714	8b29c28a-b992-46ab-807d-9b73801f2a3e	2026-08-01 08:02:53.67323+00
fdbad4a2-3541-4d92-8d60-3d38e9ae18da	2ecd1ce9-9227-48d0-9872-5038df943714	97ee4b3e-b645-499e-983f-7ed010a40938	2026-08-01 08:02:53.67323+00
836d30bb-e10c-4fc6-9c97-9b6dbf05bea8	2ecd1ce9-9227-48d0-9872-5038df943714	d77f4da8-ca5b-43c0-8528-ad5640bbce98	2026-08-01 08:02:53.67323+00
54ac6c6f-62ad-4a99-b3b8-61e9bfc81ac7	2ecd1ce9-9227-48d0-9872-5038df943714	35a7c6fe-a95d-47c0-b9aa-5401199121d8	2026-08-01 08:02:53.67323+00
a48833f9-ce59-4a29-8e20-9bc1ed2f1b56	2ecd1ce9-9227-48d0-9872-5038df943714	a334d74b-ad42-4246-b14d-2277f8e8c879	2026-08-01 08:02:53.67323+00
11d88591-c183-4dfa-bdcd-d8fe4a43afb2	2ecd1ce9-9227-48d0-9872-5038df943714	aa0ea6f9-f9c3-47ef-a5e0-85787e60c231	2026-08-01 08:02:53.67323+00
9df91b92-93fd-46d8-b347-6a4dbc22ea29	2ecd1ce9-9227-48d0-9872-5038df943714	375728d0-aded-4e11-8b74-c3ef31fce643	2026-08-01 08:02:53.67323+00
fd216f9d-9dc5-4c03-b683-5e8365456368	2ecd1ce9-9227-48d0-9872-5038df943714	71c71f2f-45f7-41ab-b25c-9f940f5d7331	2026-08-01 08:02:53.67323+00
50c4b486-3baf-4da6-b0f4-fd036fc64f6f	2ecd1ce9-9227-48d0-9872-5038df943714	cf917983-481b-4690-88c0-7dbfa8869c3d	2026-08-01 08:02:53.67323+00
fafff6cd-4b09-4e63-96e7-81ed446bb023	2ecd1ce9-9227-48d0-9872-5038df943714	0ddc8171-4e27-47c4-b979-a9410cf8feee	2026-08-01 08:02:53.67323+00
eda9fb45-bc96-4a7c-b920-072d742f896b	2ecd1ce9-9227-48d0-9872-5038df943714	abbf002f-856f-405f-b0a9-ac2b50dbcd97	2026-08-01 08:02:53.67323+00
971c1823-bccc-4c84-87a9-74dc37e42488	2ecd1ce9-9227-48d0-9872-5038df943714	92574a0a-b007-44b8-9381-6abda3c18a5e	2026-08-01 08:02:53.67323+00
0c829227-14e7-4ef8-8e6e-756815cb4b35	a8803ecd-1f18-4bd9-99f5-e4333f6b9ff4	92e5c2d7-a11f-4732-9e0a-b744fd9bbea8	2026-08-01 08:02:54.224244+00
1086aaa6-2223-4241-ba56-e2b4085b9799	a8803ecd-1f18-4bd9-99f5-e4333f6b9ff4	2821a987-986a-4f31-b21f-80c7521d4041	2026-08-01 08:02:54.224244+00
c988ff77-9a0a-4de0-890f-3ede09b74a14	a6fc26df-ac04-42e3-901a-379d60b0e2b2	263bdfc8-0016-4c68-a821-ad3949fe312c	2026-08-01 08:02:53.71899+00
2e6b895d-6dd6-4a95-be5c-207343733293	a6fc26df-ac04-42e3-901a-379d60b0e2b2	3ae995d1-d080-4bf4-8661-767e24c1693d	2026-08-01 08:02:53.71899+00
67d6d502-fdad-4630-918e-a80053cda590	a6fc26df-ac04-42e3-901a-379d60b0e2b2	81049f1f-7261-46e6-abf6-44f286c386c3	2026-08-01 08:02:53.71899+00
daaed777-ec86-4a1e-93ae-2406af11ad55	a6fc26df-ac04-42e3-901a-379d60b0e2b2	bc7ad595-24e8-4d98-85d0-b6a0150e912a	2026-08-01 08:02:53.71899+00
65c3107e-c492-4c6d-88c2-5fade692a23c	a6fc26df-ac04-42e3-901a-379d60b0e2b2	e34d71b6-cefa-4ab6-93b7-f399ad54f09d	2026-08-01 08:02:53.71899+00
19fa9231-a4c8-4c71-aeb9-73fd7f310cfc	a6fc26df-ac04-42e3-901a-379d60b0e2b2	72d8ffe6-106d-4567-8b43-bad56d4870cd	2026-08-01 08:02:53.71899+00
6dd52da2-f1b8-41de-a700-7221c1354e4e	a6fc26df-ac04-42e3-901a-379d60b0e2b2	189ca001-ed61-447d-8d2e-8d9e329f96fe	2026-08-01 08:02:53.71899+00
4cb447a7-41e7-4afc-b504-703e60ade6bf	a6fc26df-ac04-42e3-901a-379d60b0e2b2	dff45fdd-2d2a-4263-80d4-a628a732a0b8	2026-08-01 08:02:53.71899+00
e99bf573-45bd-4b46-8634-3d8adc808c27	a6fc26df-ac04-42e3-901a-379d60b0e2b2	0cf9c5ed-bccb-43b2-8d4d-115b039b9324	2026-08-01 08:02:53.71899+00
5097a189-a076-49e9-b326-167b7023c88e	a6fc26df-ac04-42e3-901a-379d60b0e2b2	92e5c2d7-a11f-4732-9e0a-b744fd9bbea8	2026-08-01 08:02:53.71899+00
e85cfcc7-0b8e-4831-9bf1-69e79bca3323	a6fc26df-ac04-42e3-901a-379d60b0e2b2	9f0e44e3-39f3-4893-a56e-6c6d7f9d8a55	2026-08-01 08:02:53.71899+00
a6e8e6ba-bcba-4ecf-bcd6-49735642f58c	a6fc26df-ac04-42e3-901a-379d60b0e2b2	2c03c6de-37f6-4ac0-8fcc-6e48076edd26	2026-08-01 08:02:53.71899+00
a393c515-ca2e-4986-94e3-42eaaa7e0cfd	a6fc26df-ac04-42e3-901a-379d60b0e2b2	341e3665-2b86-4ef2-8e5c-7befd0386ef0	2026-08-01 08:02:53.71899+00
2e383cd9-b843-4e9d-bc9b-1116bc82544f	a6fc26df-ac04-42e3-901a-379d60b0e2b2	6e26f65e-fab2-40df-aaaf-b2e4e197e469	2026-08-01 08:02:53.71899+00
7f732f4b-a6e5-4c64-b625-4b0fbda882aa	a6fc26df-ac04-42e3-901a-379d60b0e2b2	d0b0b6c0-ec39-4081-9082-a5cb7e56a1a3	2026-08-01 08:02:53.71899+00
d8e4bddd-e996-42b8-b21e-5a63037e99da	a6fc26df-ac04-42e3-901a-379d60b0e2b2	09e49302-1764-4031-9ef2-4a00e22afb81	2026-08-01 08:02:53.71899+00
1b52ad89-e849-436e-a698-3ec6892de534	a6fc26df-ac04-42e3-901a-379d60b0e2b2	8fe6c8a5-6737-477d-8a1e-b2aaded3a52c	2026-08-01 08:02:53.71899+00
20137952-b5b6-4e0d-b4b9-669842337a48	a6fc26df-ac04-42e3-901a-379d60b0e2b2	d066ba22-028f-4ffa-8924-2da3ce336d89	2026-08-01 08:02:53.71899+00
e16ce1ae-f07f-4f4d-8e23-83b17a484bf5	a6fc26df-ac04-42e3-901a-379d60b0e2b2	04a1b8cc-a3e3-4bd8-ae2c-2ba21c9dba45	2026-08-01 08:02:53.71899+00
a150b2d7-b9f4-48e5-af9d-5c4b6b6491e7	a6fc26df-ac04-42e3-901a-379d60b0e2b2	2821a987-986a-4f31-b21f-80c7521d4041	2026-08-01 08:02:53.71899+00
068c11f3-608c-417a-a2c2-64f7955f14a3	a6fc26df-ac04-42e3-901a-379d60b0e2b2	5fd4116e-2889-494f-b0ba-248c65051b86	2026-08-01 08:02:53.71899+00
cd486cf6-ca28-4640-b85c-ca0f0db7b43e	a6fc26df-ac04-42e3-901a-379d60b0e2b2	385bedfa-b4b3-4998-a7d2-0459850ec7ef	2026-08-01 08:02:53.71899+00
e4688b2a-a0f0-42cd-8358-4928470713b1	a6fc26df-ac04-42e3-901a-379d60b0e2b2	64517c90-d8c3-4852-9c6e-afa79dc2e586	2026-08-01 08:02:53.71899+00
06af02cf-df71-43be-b186-4bd12461e969	a6fc26df-ac04-42e3-901a-379d60b0e2b2	6ef3832a-a363-4f45-bbf7-dff9c07f4ba0	2026-08-01 08:02:53.71899+00
e4f04700-4e81-491b-be79-36c436118fee	a6fc26df-ac04-42e3-901a-379d60b0e2b2	a4fcfad0-11dd-4ca8-b6c0-9feca967b229	2026-08-01 08:02:53.71899+00
2d1ccce1-2874-41bf-8b74-207ff76e8733	a6fc26df-ac04-42e3-901a-379d60b0e2b2	13c0b3cb-eb7f-489e-bf37-46e28c0a8cc5	2026-08-01 08:02:53.71899+00
d151c825-74cb-4ac7-a1a7-6b2fb6e80af5	a6fc26df-ac04-42e3-901a-379d60b0e2b2	559b211c-0405-4e1f-b697-5e52c19cd66e	2026-08-01 08:02:53.71899+00
f776be4f-3a3d-443b-988f-15c5275e3209	a6fc26df-ac04-42e3-901a-379d60b0e2b2	559369db-5892-4771-b494-f13e8a82ff82	2026-08-01 08:02:53.71899+00
a5baa9aa-9a12-4291-8bad-37c5b83237fc	a6fc26df-ac04-42e3-901a-379d60b0e2b2	6ac0f0da-e195-46f3-a277-b7a3cb2b8a37	2026-08-01 08:02:53.71899+00
36cfe3bc-ff63-4af5-8190-b55054ea9b91	a6fc26df-ac04-42e3-901a-379d60b0e2b2	d878a9b4-6ff5-484c-b254-fa6c1961d34c	2026-08-01 08:02:53.71899+00
5e105b37-43fb-4be6-9839-e46779133f21	a6fc26df-ac04-42e3-901a-379d60b0e2b2	d77f4da8-ca5b-43c0-8528-ad5640bbce98	2026-08-01 08:02:53.71899+00
dbff274f-e64c-49de-947b-7956295b57dc	a6fc26df-ac04-42e3-901a-379d60b0e2b2	35a7c6fe-a95d-47c0-b9aa-5401199121d8	2026-08-01 08:02:53.71899+00
5693954a-8012-4226-9839-5fb3012e85a2	a6fc26df-ac04-42e3-901a-379d60b0e2b2	a334d74b-ad42-4246-b14d-2277f8e8c879	2026-08-01 08:02:53.71899+00
fd92e85b-e836-4bbb-961c-daef3ac60683	a6fc26df-ac04-42e3-901a-379d60b0e2b2	b84c98ad-0556-48cf-87bf-13d275230d7e	2026-08-01 08:02:53.71899+00
ac15c270-ace5-402e-ba8b-22614fe805cf	a6fc26df-ac04-42e3-901a-379d60b0e2b2	cf917983-481b-4690-88c0-7dbfa8869c3d	2026-08-01 08:02:53.71899+00
e6b2a39a-0362-4c2d-914d-47bd996d001c	a6fc26df-ac04-42e3-901a-379d60b0e2b2	0ddc8171-4e27-47c4-b979-a9410cf8feee	2026-08-01 08:02:53.71899+00
3d19ac28-4800-4e04-8bed-021606bca3b9	a6fc26df-ac04-42e3-901a-379d60b0e2b2	abbf002f-856f-405f-b0a9-ac2b50dbcd97	2026-08-01 08:02:53.71899+00
6de56d8d-d086-4eeb-8303-3a7a25b48863	a6fc26df-ac04-42e3-901a-379d60b0e2b2	92574a0a-b007-44b8-9381-6abda3c18a5e	2026-08-01 08:02:53.71899+00
6c78b82a-6b86-49ff-a7e7-0501402e5e7e	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	a70b19b6-b661-4a47-bc8b-987e1ec876d9	2026-08-01 08:02:54.021526+00
c08e2b85-dace-411d-bb44-ee50af35bfe9	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	263bdfc8-0016-4c68-a821-ad3949fe312c	2026-08-01 08:02:54.021526+00
80c0a28f-acaa-4520-8b7a-9df6431738c0	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	3ae995d1-d080-4bf4-8661-767e24c1693d	2026-08-01 08:02:54.021526+00
ebb9cdd1-e038-41d2-a874-d1f995be626c	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	81049f1f-7261-46e6-abf6-44f286c386c3	2026-08-01 08:02:54.021526+00
a1aa15df-c06f-4404-959f-45645eff8445	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	bc7ad595-24e8-4d98-85d0-b6a0150e912a	2026-08-01 08:02:54.021526+00
76e402fb-a79d-4696-9738-cb17195f5f64	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	e34d71b6-cefa-4ab6-93b7-f399ad54f09d	2026-08-01 08:02:54.021526+00
805425fd-636b-4ff3-a699-418b75839f66	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	72d8ffe6-106d-4567-8b43-bad56d4870cd	2026-08-01 08:02:54.021526+00
ef37dd24-1c05-4025-82eb-e6e34b7c943b	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	189ca001-ed61-447d-8d2e-8d9e329f96fe	2026-08-01 08:02:54.021526+00
419893f4-4db9-48c4-a943-ece95fc889ca	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	dff45fdd-2d2a-4263-80d4-a628a732a0b8	2026-08-01 08:02:54.021526+00
0148fd4e-5e0d-41fb-b085-6ee9598d43f2	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	0cf9c5ed-bccb-43b2-8d4d-115b039b9324	2026-08-01 08:02:54.021526+00
0ef9e32e-ecf9-4c61-accd-19ab03b56f06	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	92e5c2d7-a11f-4732-9e0a-b744fd9bbea8	2026-08-01 08:02:54.021526+00
bcd0d403-106c-43c3-94c3-d587a7d6bf09	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	9f0e44e3-39f3-4893-a56e-6c6d7f9d8a55	2026-08-01 08:02:54.021526+00
a6d2d21f-ccc9-48bf-9192-1f32fdc892d7	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	2c03c6de-37f6-4ac0-8fcc-6e48076edd26	2026-08-01 08:02:54.021526+00
878fdbb3-ecfe-4fce-bcaa-23af3069593b	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	341e3665-2b86-4ef2-8e5c-7befd0386ef0	2026-08-01 08:02:54.021526+00
a8789486-b7d0-4f41-be09-8ba45832f658	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	6e26f65e-fab2-40df-aaaf-b2e4e197e469	2026-08-01 08:02:54.021526+00
29a86ac8-1fb3-4921-86d8-7d351fa77231	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	d0b0b6c0-ec39-4081-9082-a5cb7e56a1a3	2026-08-01 08:02:54.021526+00
39030aec-efde-4a0f-b6bd-272bf6953278	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	09e49302-1764-4031-9ef2-4a00e22afb81	2026-08-01 08:02:54.021526+00
90db49f6-ad5f-48f4-acb2-1f3f7a6c51aa	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	8fe6c8a5-6737-477d-8a1e-b2aaded3a52c	2026-08-01 08:02:54.021526+00
e44ce08e-b940-4d55-8917-2ae9e286e481	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	d066ba22-028f-4ffa-8924-2da3ce336d89	2026-08-01 08:02:54.021526+00
cc237d54-2950-4ffb-94fa-9e469b0da067	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	04a1b8cc-a3e3-4bd8-ae2c-2ba21c9dba45	2026-08-01 08:02:54.021526+00
27d0f9a9-3fde-4453-8d85-2c12460b8715	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	2821a987-986a-4f31-b21f-80c7521d4041	2026-08-01 08:02:54.021526+00
d29fd713-4cf7-43c9-b9b3-a8590f6f0865	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	5fd4116e-2889-494f-b0ba-248c65051b86	2026-08-01 08:02:54.021526+00
97fb9231-ea19-43e5-86fe-8eaae96bee5e	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	385bedfa-b4b3-4998-a7d2-0459850ec7ef	2026-08-01 08:02:54.021526+00
b04c643a-b043-45df-8959-0b9bd816ce69	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	64517c90-d8c3-4852-9c6e-afa79dc2e586	2026-08-01 08:02:54.021526+00
4b78ae14-c5b8-4219-ae3b-ba6d2f650cc9	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	6ef3832a-a363-4f45-bbf7-dff9c07f4ba0	2026-08-01 08:02:54.021526+00
67c251c7-4d4a-4f89-a568-37a223d12bbe	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	a4fcfad0-11dd-4ca8-b6c0-9feca967b229	2026-08-01 08:02:54.021526+00
e97f51c4-b96a-4e79-95dc-87bb260acd1b	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	c6d60783-1b5b-41a2-8338-7e06a78f5a1c	2026-08-01 08:02:54.021526+00
cbf910d6-124a-4c4e-8d02-8ba6df7c9cf8	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	f9961660-698c-4b5c-880b-bc3ded18c725	2026-08-01 08:02:54.021526+00
860800ba-e314-487d-a5b1-26aa857db34c	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	ca648b9e-8f56-4970-8f22-23abef6c636a	2026-08-01 08:02:54.021526+00
c1cd485b-4bc3-471d-9f44-ac44b005795c	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	eed09c5a-050b-4ef3-bb1b-d19c07a194bf	2026-08-01 08:02:54.021526+00
f22faa5c-7979-4aa0-bf90-cec313b68556	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	13c0b3cb-eb7f-489e-bf37-46e28c0a8cc5	2026-08-01 08:02:54.021526+00
99ff6019-8b5b-4ac8-9ad4-7c51547a3b34	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	559b211c-0405-4e1f-b697-5e52c19cd66e	2026-08-01 08:02:54.021526+00
8bab0dc3-8472-4a77-b02c-70becc6aec15	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	559369db-5892-4771-b494-f13e8a82ff82	2026-08-01 08:02:54.021526+00
42b1357b-609a-4e3a-8786-4b5b3e93147a	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	6ac0f0da-e195-46f3-a277-b7a3cb2b8a37	2026-08-01 08:02:54.021526+00
915bc6ce-a4db-4fb8-a657-1d79fed13662	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	d878a9b4-6ff5-484c-b254-fa6c1961d34c	2026-08-01 08:02:54.021526+00
1470a08b-bea9-4f75-8fb0-c36038ce90b9	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	aa0ea6f9-f9c3-47ef-a5e0-85787e60c231	2026-08-01 08:02:54.021526+00
f016d718-8750-46e5-a2db-ae61a6003464	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	375728d0-aded-4e11-8b74-c3ef31fce643	2026-08-01 08:02:54.021526+00
f1d78207-1834-4168-97f4-827467b3d939	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	71c71f2f-45f7-41ab-b25c-9f940f5d7331	2026-08-01 08:02:54.021526+00
a0c0a660-67c3-4635-8d62-9ad81ed7a01b	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	f0d74dc7-0aed-42a6-ad11-d41918d9a44e	2026-08-01 08:02:54.021526+00
2c9fc96a-cc75-46c7-b5e6-e1e3175a03d7	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	cf917983-481b-4690-88c0-7dbfa8869c3d	2026-08-01 08:02:54.021526+00
aabfdd91-c271-431a-be2c-acffce6cd602	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	0ddc8171-4e27-47c4-b979-a9410cf8feee	2026-08-01 08:02:54.021526+00
3ded10fc-d2ff-4505-b17e-141fdc1057f8	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	abbf002f-856f-405f-b0a9-ac2b50dbcd97	2026-08-01 08:02:54.021526+00
b891aaf5-e7d4-486f-99f9-153672d425e2	a65c2b33-2e01-4e68-8cb7-c2bf240176f5	92574a0a-b007-44b8-9381-6abda3c18a5e	2026-08-01 08:02:54.021526+00
\.


--
-- Data for Name: role_profile_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.role_profile_roles (role_profile_id, role_id) FROM stdin;
\.


--
-- Data for Name: role_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.role_profiles (id, name, description, created_at) FROM stdin;
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, code, name, description, is_system, created_at, updated_at, role_level) FROM stdin;
50d08bae-e000-45cd-b908-3025a0243555	admin_heavy_eq	Admin Alat Berat	Specialist Admin for Heavy Equipment	t	2026-07-28 06:53:48.675848+00	2026-07-28 06:53:48.675848+00	4
a65c2b33-2e01-4e68-8cb7-c2bf240176f5	admin_vehicle	Admin Kendaraan	Specialist Admin for Vehicles	t	2026-07-28 06:53:48.675848+00	2026-07-28 06:53:48.675848+00	4
a6fc26df-ac04-42e3-901a-379d60b0e2b2	admin_infra	Admin Infrastruktur	Specialist Admin for Infrastructure	t	2026-07-28 06:53:48.675848+00	2026-07-28 06:53:48.675848+00	4
d089540e-0927-4f6f-82f0-251ab7ada2ab	supervisor	Supervisor	Technical Supervisor (Approval L1)	t	2026-07-28 06:53:48.675848+00	2026-07-28 06:53:48.675848+00	3
2ecd1ce9-9227-48d0-9872-5038df943714	super_admin	Super Administrator	Full system access	t	2026-07-28 06:53:48.322287+00	2026-07-28 06:53:48.675848+00	1
0022d4ed-c891-4301-8ea1-1b73b51f93ac	manager	Manager	Department/team manager	t	2026-07-28 06:53:48.322287+00	2026-07-28 06:53:48.675848+00	2
20998ca7-c4cd-4bba-b629-0a6232ff1a9b	admin	Administrator	Organization administrator	t	2026-07-28 06:53:48.322287+00	2026-07-28 06:53:48.675848+00	4
a8803ecd-1f18-4bd9-99f5-e4333f6b9ff4	technician	Technician	Maintenance technician	t	2026-07-28 06:53:48.322287+00	2026-07-28 06:53:48.675848+00	5
09af3987-c52e-40f6-8e5e-a7228a9b170f	staff	Staff	General staff	t	2026-07-28 06:53:48.322287+00	2026-07-28 06:53:48.675848+00	5
22675626-c0f9-49f6-8b75-ffb049e717fd	user	User	Basic user access	t	2026-07-28 06:53:48.322287+00	2026-07-28 06:53:48.675848+00	5
67159545-870a-46dc-8dc7-a983e742b30b	GENERAL_MANAGER	General Manager	All Departements	f	2026-08-01 06:42:49.274469+00	2026-08-01 06:42:49.274469+00	2
\.


--
-- Data for Name: sales_invoice_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sales_invoice_items (id, invoice_id, description, quantity, unit_price, total_price, account_id, source_type, source_id, source_line_id) FROM stdin;
\.


--
-- Data for Name: sales_invoices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sales_invoices (id, invoice_number, client_id, date, due_date, subject, message, subtotal, discount, tax, total_amount, amount_paid, status, created_by, journal_entry_id, created_at, updated_at, attachment_url, company_id, custom_data) FROM stdin;
\.


--
-- Data for Name: sales_order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sales_order_items (id, order_id, description, quantity, unit_price, total_price, account_id) FROM stdin;
\.


--
-- Data for Name: sales_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sales_orders (id, order_number, quote_id, client_id, date, delivery_date, subject, message, subtotal, discount, tax, total_amount, status, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sales_quote_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sales_quote_items (id, quote_id, description, quantity, unit_price, total_price, account_id) FROM stdin;
\.


--
-- Data for Name: sales_quotes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sales_quotes (id, quote_number, client_id, date, expiry_date, subject, message, subtotal, discount, tax, total_amount, status, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sales_shipment_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sales_shipment_items (id, shipment_id, order_item_id, description, quantity_shipped, source_type, source_id, source_line_id) FROM stdin;
\.


--
-- Data for Name: sales_shipments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sales_shipments (id, shipment_number, sales_order_id, client_id, date, courier_name, tracking_number, recipient_name, address, notes, status, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: saved_reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.saved_reports (id, definition_id, name, parameters, file_path, file_size, output_format, generated_by, generated_at, generation_time_ms, is_scheduled, schedule_cron, next_run_at, status, error_message) FROM stdin;
\.


--
-- Data for Name: sensor_aggregates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sensor_aggregates (asset_id, sensor_id, period_type, period_start, min_value, max_value, avg_value, sum_value, count_readings) FROM stdin;
\.


--
-- Data for Name: sensor_alerts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sensor_alerts (id, asset_id, sensor_id, threshold_id, alert_type, severity, sensor_value, threshold_value, status, acknowledged_by, acknowledged_at, resolved_by, resolved_at, resolution_notes, created_at) FROM stdin;
\.


--
-- Data for Name: sensor_readings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sensor_readings ("time", asset_id, sensor_id, temperature, humidity, vibration_x, vibration_y, vibration_z, pressure, power_consumption, custom_value, unit, status_code, quality) FROM stdin;
\.


--
-- Data for Name: sensor_thresholds; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sensor_thresholds (id, asset_id, sensor_type, min_value, max_value, warning_min, warning_max, alert_enabled, alert_delay_seconds, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.settings (key, value, description, updated_at, updated_by) FROM stdin;
app_name	"Asset Management System"	Application Name	2026-07-28 06:53:49.981944+00	\N
company_logo	null	URL to Company Logo	2026-07-28 06:53:49.981944+00	\N
tax_rate	0.11	Default Tax Rate (11%)	2026-07-28 06:53:49.981944+00	\N
tax_renewal_warning_days	{"KIR": 30, "TAX": 30, "STNK": 30, "DEFAULT": 30, "LAPOR_TIBA": 30, "HEAVY_EQUIPMENT_TAX": 30}	Days before expiry to trigger renewal warning (Granular by type)	2026-07-28 06:53:50.574726+00	\N
ai_endpoint	"http://localhost:20128/v1"	\N	2026-07-28 06:56:08.700447+00	00000000-0000-0000-0000-000000000001
ai_provider	"custom"	\N	2026-07-28 06:56:08.707475+00	00000000-0000-0000-0000-000000000001
ai_model	"combo-kantor"	\N	2026-07-28 06:56:08.714898+00	00000000-0000-0000-0000-000000000001
ai_agent_name	"Ambo"	\N	2026-07-28 06:56:27.270861+00	00000000-0000-0000-0000-000000000001
launchpad_config	{"modules": [{"id": "insights", "icon": "BarChart3", "order": 1, "title": "Insights & Reporting", "iconBg": "bg-gradient-to-br from-blue-500 to-cyan-500", "enabled": true, "menuIds": ["dashboard", "analytics", "reports"], "features": ["Dashboard Overview", "Analytics", "Reports"], "gradient": "from-blue-500/20 to-cyan-500/20", "minLevel": 5, "subtitle": "Business Intelligence", "defaultRoute": "/dashboard"}, {"id": "asset-management", "icon": "Box", "order": 2, "title": "Asset Management", "iconBg": "bg-gradient-to-br from-emerald-500 to-teal-500", "enabled": true, "menuIds": ["assets", "asset-lifecycle", "conversions", "asset-audit"], "features": ["Asset Registry", "Lifecycle", "Asset Conversions", "Asset Audit"], "gradient": "from-emerald-500/20 to-teal-500/20", "minLevel": 5, "subtitle": "Asset Registry & Tracking", "defaultRoute": "/assets"}, {"id": "field-operations", "icon": "Wrench", "order": 3, "title": "Field Operations", "iconBg": "bg-gradient-to-br from-amber-500 to-orange-500", "enabled": true, "menuIds": ["work-orders", "maintenance-schedules", "fuel", "tax-renewals"], "features": ["Work Orders", "PM Schedules", "Fuel & Tax"], "gradient": "from-amber-500/20 to-orange-500/20", "minLevel": 5, "subtitle": "Maintenance & Services", "defaultRoute": "/work-orders"}, {"id": "commercial", "icon": "TrendingUp", "order": 4, "title": "Commercial & Revenue", "iconBg": "bg-gradient-to-br from-violet-500 to-purple-500", "enabled": true, "menuIds": ["rentals", "contracts", "sales-invoices", "clients", "loans", "purchase-bills"], "features": ["Rental Operations", "Contracts", "Client Management", "Procurement & Vendor Bills"], "gradient": "from-violet-500/20 to-purple-500/20", "minLevel": 4, "subtitle": "Sales, Rentals & Procurement", "defaultRoute": "/rentals"}, {"id": "supply-chain", "icon": "ShoppingBag", "order": 5, "title": "Supply Chain", "iconBg": "bg-gradient-to-br from-orange-500 to-red-400", "enabled": true, "menuIds": ["inventory-items", "inventory-categories", "stock-opname"], "features": ["Inventory Control", "Stock Opname"], "gradient": "from-orange-500/20 to-red-500/20", "minLevel": 3, "subtitle": "Inventory Management", "defaultRoute": "/inventory-items"}, {"id": "finance", "icon": "Wallet", "order": 6, "title": "Finance & Accounting", "iconBg": "bg-gradient-to-br from-green-500 to-emerald-500", "enabled": true, "menuIds": ["finance", "cash-bank", "expenses", "journal-entries", "financial-reports"], "features": ["Cash & Bank", "Expenses", "General Ledger"], "gradient": "from-green-500/20 to-emerald-500/20", "minLevel": 2, "subtitle": "Financial Management", "defaultRoute": "/cash-bank"}, {"id": "hr", "icon": "Users", "order": 7, "title": "Human Resources", "iconBg": "bg-gradient-to-br from-pink-500 to-rose-500", "enabled": true, "menuIds": ["employees", "departments", "attendance", "leaves"], "features": ["Employees", "Attendance", "Leave Management"], "gradient": "from-pink-500/20 to-rose-500/20", "minLevel": 3, "subtitle": "People Management", "defaultRoute": "/employees"}, {"id": "admin", "icon": "Settings", "order": 8, "title": "System Administration", "iconBg": "bg-gradient-to-br from-slate-500 to-gray-500", "enabled": true, "menuIds": ["categories", "inventory-categories", "locations", "maintenance-templates", "contract-templates", "approvals", "users", "roles", "approval-workflow-settings", "audit", "settings"], "features": ["Master Data & Templates", "Users & Roles", "System Config"], "gradient": "from-slate-500/20 to-gray-500/20", "minLevel": 2, "subtitle": "Configuration & Security", "defaultRoute": "/approvals"}], "globalMenuIds": ["profile"]}	Launchpad module-to-menu mapping configuration. Customizable via Settings UI.	2026-07-30 08:14:43.415404+00	\N
\.


--
-- Data for Name: stock_ledger_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_ledger_entries (id, company_id, warehouse_id, item_id, posting_date, posting_datetime, actual_qty_delta, qty_after, valuation_rate, stock_value_delta, stock_value_after, voucher_type, voucher_no, voucher_id, voucher_line_id, batch_no, serial_no, is_cancelled, created_at, created_by) FROM stdin;
\.


--
-- Data for Name: stock_reservations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_reservations (id, company_id, warehouse_id, item_id, reserved_qty, voucher_type, voucher_id, created_at) FROM stdin;
\.


--
-- Data for Name: support_tickets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.support_tickets (id, company_id, ticket_number, subject, priority, status, asset_id, created_at) FROM stdin;
\.


--
-- Data for Name: system_backup_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_backup_logs (id, tenant_id, backup_name, size_bytes, backup_status, restore_verified_at, created_at) FROM stdin;
\.


--
-- Data for Name: system_health_checks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_health_checks (id, node_id, service_name, status, latency_ms, checked_at) FROM stdin;
\.


--
-- Data for Name: system_job_locks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_job_locks (job_name, locked_by, locked_at, expires_at) FROM stdin;
\.


--
-- Data for Name: tenant_provisioning_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tenant_provisioning_logs (id, tenant_id, site_domain, provision_status, started_at, completed_at) FROM stdin;
\.


--
-- Data for Name: timesheets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.timesheets (id, project_task_id, employee_id, work_date, hours, is_billable, status, created_at) FROM stdin;
\.


--
-- Data for Name: units; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.units (id, code, name) FROM stdin;
1	UNIT	Unit
2	SET	Set
3	PCS	Pieces
4	BOX	Box
5	LITER	Liter
6	DRUM	Drum
7	KG	Kilogram
8	MTR	Meter
9	ROLL	Roll
10	PCK	Pack
\.


--
-- Data for Name: user_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_permissions (id, user_id, allow_doctype, for_value, is_default, created_at) FROM stdin;
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_roles (id, user_id, role_id, organization_id, granted_by, granted_at, expires_at) FROM stdin;
80a0c6d9-e071-48ab-bc8e-ef09ae2a4b24	00000000-0000-0000-0000-000000000001	2ecd1ce9-9227-48d0-9872-5038df943714	11111111-1111-1111-1111-111111111111	\N	2026-07-28 06:53:48.524635+00	\N
5c53fbd8-de4d-4d42-a8d1-c3c6f838ac4b	00000000-0000-0000-0000-000000000002	0022d4ed-c891-4301-8ea1-1b73b51f93ac	11111111-1111-1111-1111-111111111111	\N	2026-07-28 06:53:48.524635+00	\N
c5796eb7-043a-45f5-81cf-117eb74cf963	00000000-0000-0000-0000-000000000003	a8803ecd-1f18-4bd9-99f5-e4333f6b9ff4	11111111-1111-1111-1111-111111111111	\N	2026-07-28 06:53:48.524635+00	\N
4ec1f10b-f92a-4240-b70d-7852e814a32c	00000000-0000-0000-0000-000000000004	22675626-c0f9-49f6-8b75-ffb049e717fd	11111111-1111-1111-1111-111111111111	\N	2026-07-28 06:53:48.524635+00	\N
2fc8cb99-8bfb-42b6-9659-a172765d72bd	d6d34f98-d4b0-4475-b071-fe93b9a0c845	09af3987-c52e-40f6-8e5e-a7228a9b170f	11111111-1111-1111-1111-111111111111	\N	2026-08-01 03:30:45.369943+00	\N
08e08f1c-0d25-4dff-87e3-eb84add11ed1	05d7fe35-5f4f-45e7-8ca4-e7ff4d8f307e	50d08bae-e000-45cd-b908-3025a0243555	11111111-1111-1111-1111-111111111111	\N	2026-08-01 07:02:00.210281+00	\N
c829de96-1d3b-4ab1-9359-78f4e3ccebb5	4dcd4d42-f79f-41e6-bb61-ecae5eb1239a	a6fc26df-ac04-42e3-901a-379d60b0e2b2	11111111-1111-1111-1111-111111111111	\N	2026-08-01 07:02:53.393835+00	\N
bbe2eafb-4818-47d2-bcc0-9384ca2ca338	8d957363-f1b5-4373-9fc4-15c50f3988e3	50d08bae-e000-45cd-b908-3025a0243555	11111111-1111-1111-1111-111111111111	\N	2026-08-01 09:23:21.155466+00	\N
9143d6ac-39a8-415e-bde0-a8697c632850	4c25547a-79b4-42f3-b1ca-bbb7c106fec3	d089540e-0927-4f6f-82f0-251ab7ada2ab	\N	\N	2026-08-03 05:10:21.348711+00	\N
0ac8ec32-882e-478d-956d-1cd8396c3910	b411646d-e00b-4a66-a588-a3e17bedc887	20998ca7-c4cd-4bba-b629-0a6232ff1a9b	\N	\N	2026-08-03 05:10:21.348711+00	\N
0c1913f5-3277-403a-bd59-5948c1a4ba49	00000000-0000-0000-0000-000000000002	0022d4ed-c891-4301-8ea1-1b73b51f93ac	\N	\N	2026-08-03 05:10:21.348711+00	\N
84b2b023-9a78-48d7-8af6-9cfe191f2d8e	00000000-0000-0000-0000-000000000003	a8803ecd-1f18-4bd9-99f5-e4333f6b9ff4	\N	\N	2026-08-03 05:10:21.348711+00	\N
bf1bb81c-55ad-467d-bbbf-3f8fe4b3dc6a	00000000-0000-0000-0000-000000000004	22675626-c0f9-49f6-8b75-ffb049e717fd	\N	\N	2026-08-03 05:10:21.348711+00	\N
9e2583bc-28c5-4758-9586-447453c576f9	d6d34f98-d4b0-4475-b071-fe93b9a0c845	09af3987-c52e-40f6-8e5e-a7228a9b170f	\N	\N	2026-08-03 05:10:21.348711+00	\N
7c337624-2c21-4e7c-87e2-060a177138a2	8d957363-f1b5-4373-9fc4-15c50f3988e3	50d08bae-e000-45cd-b908-3025a0243555	\N	\N	2026-08-03 05:10:21.348711+00	\N
35673ed0-02a4-42cb-a366-fd0ac2582307	05d7fe35-5f4f-45e7-8ca4-e7ff4d8f307e	50d08bae-e000-45cd-b908-3025a0243555	\N	\N	2026-08-03 05:10:21.348711+00	\N
994c8200-bff2-4df9-bf11-e891da60ab7e	4dcd4d42-f79f-41e6-bb61-ecae5eb1239a	a6fc26df-ac04-42e3-901a-379d60b0e2b2	\N	\N	2026-08-03 05:10:21.348711+00	\N
8d12e90d-db7f-4c3a-9c5c-7577e916598d	00000000-0000-0000-0000-000000000001	2ecd1ce9-9227-48d0-9872-5038df943714	\N	\N	2026-08-03 05:10:21.348711+00	\N
3b75ffcb-69ae-49ec-8824-6730951602d2	60dbb079-1af9-48bf-a386-c661ae28ea3d	a8803ecd-1f18-4bd9-99f5-e4333f6b9ff4	\N	\N	2026-08-03 09:02:37.952832+00	\N
5c305684-d20f-480e-9fa0-cad10eba0b63	60dbb079-1af9-48bf-a386-c661ae28ea3d	d089540e-0927-4f6f-82f0-251ab7ada2ab	\N	\N	2026-08-03 09:02:37.952832+00	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, password_hash, name, role, department_id, is_active, created_at, updated_at, organization_id, role_id, phone, avatar_url, department, allowed_asset_group) FROM stdin;
4c25547a-79b4-42f3-b1ca-bbb7c106fec3	supervisor@example.com	$argon2id$v=19$m=19456,t=2,p=1$am15RFJiftnmAqQxPB4vyA$2VTUCevB1dsOPNwjg0A1P4QkUgKOAyr3V35JF3AN2WU	Supervisor Operasional	supervisor	22222222-2222-2222-2222-222222222204	t	2026-07-28 06:53:48.958494+00	2026-08-03 02:39:30.097824+00	11111111-1111-1111-1111-111111111111	d089540e-0927-4f6f-82f0-251ab7ada2ab	\N	\N	\N	\N
b411646d-e00b-4a66-a588-a3e17bedc887	org.admin@example.com	$argon2id$v=19$m=19456,t=2,p=1$am15RFJiftnmAqQxPB4vyA$2VTUCevB1dsOPNwjg0A1P4QkUgKOAyr3V35JF3AN2WU	Organization Admin	admin	22222222-2222-2222-2222-222222222202	t	2026-07-28 06:53:48.974973+00	2026-08-03 02:39:30.097824+00	11111111-1111-1111-1111-111111111111	20998ca7-c4cd-4bba-b629-0a6232ff1a9b	\N	\N	\N	\N
00000000-0000-0000-0000-000000000002	manager@example.com	$argon2id$v=19$m=19456,t=2,p=1$am15RFJiftnmAqQxPB4vyA$2VTUCevB1dsOPNwjg0A1P4QkUgKOAyr3V35JF3AN2WU	Asset Manager	manager	22222222-2222-2222-2222-222222222201	t	2026-07-28 06:53:48.524635+00	2026-08-03 02:39:30.097824+00	11111111-1111-1111-1111-111111111111	0022d4ed-c891-4301-8ea1-1b73b51f93ac	\N	\N	\N	\N
00000000-0000-0000-0000-000000000003	technician@example.com	$argon2id$v=19$m=19456,t=2,p=1$am15RFJiftnmAqQxPB4vyA$2VTUCevB1dsOPNwjg0A1P4QkUgKOAyr3V35JF3AN2WU	Maintenance Technician	technician	22222222-2222-2222-2222-222222222204	t	2026-07-28 06:53:48.524635+00	2026-08-03 02:39:30.097824+00	11111111-1111-1111-1111-111111111111	a8803ecd-1f18-4bd9-99f5-e4333f6b9ff4	\N	\N	\N	\N
00000000-0000-0000-0000-000000000004	user@example.com	$argon2id$v=19$m=19456,t=2,p=1$am15RFJiftnmAqQxPB4vyA$2VTUCevB1dsOPNwjg0A1P4QkUgKOAyr3V35JF3AN2WU	Regular User	user	22222222-2222-2222-2222-222222222202	t	2026-07-28 06:53:48.524635+00	2026-08-03 02:39:30.097824+00	11111111-1111-1111-1111-111111111111	22675626-c0f9-49f6-8b75-ffb049e717fd	\N	\N	\N	\N
d6d34f98-d4b0-4475-b071-fe93b9a0c845	staff@example.com	$argon2id$v=19$m=19456,t=2,p=1$am15RFJiftnmAqQxPB4vyA$2VTUCevB1dsOPNwjg0A1P4QkUgKOAyr3V35JF3AN2WU	General Staff	staff	22222222-2222-2222-2222-222222222204	t	2026-07-28 06:53:48.974973+00	2026-08-03 02:39:30.097824+00	11111111-1111-1111-1111-111111111111	09af3987-c52e-40f6-8e5e-a7228a9b170f	\N	\N		\N
60dbb079-1af9-48bf-a386-c661ae28ea3d	budi.san@example.com	$argon2id$v=19$m=19456,t=2,p=1$41HI8AmFG6xG6wDbTujb3g$fwMcQK4W0bDnCnu+N0SqnqgZ7mpUZ3OrrA+eT1Ju3Jk	Budi Santoso	technician	\N	t	2026-08-03 04:40:55.252977+00	2026-08-03 09:07:57.035688+00	\N	a8803ecd-1f18-4bd9-99f5-e4333f6b9ff4	\N	\N	\N	\N
8d957363-f1b5-4373-9fc4-15c50f3988e3	heavy@sjs.com	$argon2id$v=19$m=19456,t=2,p=1$1fvuB/qh0LMou5ZSfj0uog$PFQAtesJqTCKtOYuHYgjry9ZxEbdhG0LNxuIdf7O0L0	Ambo Tuo	admin_heavy_eq	\N	t	2026-07-28 06:53:48.958494+00	2026-08-04 02:03:25.402914+00	11111111-1111-1111-1111-111111111111	50d08bae-e000-45cd-b908-3025a0243555	\N	\N	\N	ALAT_BERAT
05d7fe35-5f4f-45e7-8ca4-e7ff4d8f307e	vehicle@sjs.com	$argon2id$v=19$m=19456,t=2,p=1$XQPRkQfRvzxS1zTBFa1FJQ$SX2d7qvnIUs/k8xTF3POxrFCFNJFvOJ30EmX3VerQOw	Asbar Risno	admin_heavy_eq	\N	t	2026-07-28 06:53:48.958494+00	2026-08-04 02:03:46.762279+00	11111111-1111-1111-1111-111111111111	50d08bae-e000-45cd-b908-3025a0243555	\N	\N	\N	KENDARAAN
4dcd4d42-f79f-41e6-bb61-ecae5eb1239a	infra@sjs.com	$argon2id$v=19$m=19456,t=2,p=1$wj5plTEr+TV8VY3ccPuWpw$ubu1umOXwHvVCYbrBMlI3Ij7WP/Pya9s6iE6MOmr9Uw	Infras	admin_infra	\N	t	2026-07-28 06:53:48.958494+00	2026-08-04 02:04:05.589202+00	11111111-1111-1111-1111-111111111111	a6fc26df-ac04-42e3-901a-379d60b0e2b2	\N	\N	\N	INFRASTRUKTUR
00000000-0000-0000-0000-000000000001	admin@sjs.com	$argon2id$v=19$m=19456,t=2,p=1$am15RFJiftnmAqQxPB4vyA$2VTUCevB1dsOPNwjg0A1P4QkUgKOAyr3V35JF3AN2WU	System Administrator	super_admin	\N	t	2026-07-28 06:53:48.524635+00	2026-08-07 05:05:06.601162+00	11111111-1111-1111-1111-111111111111	2ecd1ce9-9227-48d0-9872-5038df943714	\N	\N	\N	\N
00000000-0000-0000-0000-000000000099	admin@example.com	$argon2id$v=19$m=19456,t=2,p=1$am15RFJiftnmAqQxPB4vyA$2VTUCevB1dsOPNwjg0A1P4QkUgKOAyr3V35JF3AN2WU	Admin User	super_admin	\N	t	2026-08-07 05:05:48.221555+00	2026-08-07 05:30:25.599964+00	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: vehicle_details; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vehicle_details (asset_id, license_plate, brand, model, color, vin, engine_number, bpkb_number, stnk_expiry, kir_expiry, tax_expiry, fuel_type, transmission, capacity, odometer_last, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: vendors; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vendors (id, code, name, contact_person, phone, email, address, is_active, created_at, updated_at, company_id, payment_terms_days, currency, npwp, nik, tax_name, tax_address) FROM stdin;
55555555-5555-5555-5555-555555555501	VEND-001	PT Teknologi Maju	Budi Santoso	021-5551234	budi@tekno.com	Jl. Sudirman No. 123, Jakarta	t	2026-07-28 06:53:48.524635+00	2026-07-28 06:53:48.524635+00	\N	30	IDR	\N	\N	\N	\N
55555555-5555-5555-5555-555555555502	VEND-002	CV Mebel Jaya	Ani Wijaya	021-5552345	ani@mebeljaya.com	Jl. Gatot Subroto No. 45, Jakarta	t	2026-07-28 06:53:48.524635+00	2026-07-28 06:53:48.524635+00	\N	30	IDR	\N	\N	\N	\N
55555555-5555-5555-5555-555555555503	VEND-003	PT Servis Prima	Dedi Cahyono	021-5553456	dedi@servispri.com	Jl. HR Rasuna Said No. 67, Jakarta	t	2026-07-28 06:53:48.524635+00	2026-07-28 06:53:48.524635+00	\N	30	IDR	\N	\N	\N	\N
\.


--
-- Data for Name: warehouses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.warehouses (id, company_id, parent_id, code, name, is_active, is_group, is_frozen, warehouse_type, created_at, updated_at) FROM stdin;
00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000000	\N	WH-MAIN	Main Warehouse	t	f	f	DEFAULT	2026-08-07 03:51:16.476407+00	2026-08-07 03:51:16.476407+00
\.


--
-- Data for Name: work_experiences; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.work_experiences (id, employee_id, company_name, "position", start_date, end_date, description, attachment_urls, created_at) FROM stdin;
\.


--
-- Data for Name: workflow_action_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.workflow_action_logs (id, workflow_id, document_id, action_by_user_id, from_state, action_name, to_state, comments, created_at) FROM stdin;
\.


--
-- Data for Name: workflow_states; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.workflow_states (id, workflow_id, state_name, doc_status, allow_edit_role_id, style_variant, created_at) FROM stdin;
d8586b7e-ae6f-4902-a243-db4b673ff7a5	8eb81d7e-bf00-4278-b264-6539f705bbc5	Draft	0	\N	secondary	2026-08-07 06:57:42.765392+00
17b51e76-38ef-4b90-8ff5-b11990675ad1	8eb81d7e-bf00-4278-b264-6539f705bbc5	Pending Supervisor	0	\N	warning	2026-08-07 06:57:42.765392+00
36bdfbee-7f7b-4c5c-b842-3b21f76f258b	8eb81d7e-bf00-4278-b264-6539f705bbc5	Approved	1	\N	success	2026-08-07 06:57:42.765392+00
131dca61-d2f1-4019-bc1e-2a4375d46c0d	8eb81d7e-bf00-4278-b264-6539f705bbc5	Rejected	2	\N	danger	2026-08-07 06:57:42.765392+00
\.


--
-- Data for Name: workflow_transitions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.workflow_transitions (id, workflow_id, state_id, action_name, next_state_id, allowed_role_id, created_at) FROM stdin;
37bac4aa-d1ab-4ced-9857-07dbaed10881	8eb81d7e-bf00-4278-b264-6539f705bbc5	d8586b7e-ae6f-4902-a243-db4b673ff7a5	Submit for Approval	17b51e76-38ef-4b90-8ff5-b11990675ad1	2ecd1ce9-9227-48d0-9872-5038df943714	2026-08-07 06:57:42.765392+00
9a80fd64-3b3a-4881-b0ec-31647e351265	8eb81d7e-bf00-4278-b264-6539f705bbc5	17b51e76-38ef-4b90-8ff5-b11990675ad1	Approve WorkOrder	36bdfbee-7f7b-4c5c-b842-3b21f76f258b	2ecd1ce9-9227-48d0-9872-5038df943714	2026-08-07 06:57:42.765392+00
394d5bec-be26-4d79-98de-a7cdf2827fce	8eb81d7e-bf00-4278-b264-6539f705bbc5	17b51e76-38ef-4b90-8ff5-b11990675ad1	Reject WorkOrder	131dca61-d2f1-4019-bc1e-2a4375d46c0d	2ecd1ce9-9227-48d0-9872-5038df943714	2026-08-07 06:57:42.765392+00
\.


--
-- Data for Name: workflows; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.workflows (id, workflow_name, doctype_id, is_active, document_status_field, created_at, updated_at) FROM stdin;
8eb81d7e-bf00-4278-b264-6539f705bbc5	WorkOrder Approval Workflow	b990031a-ae81-4939-bf53-373dc61eda59	t	workflow_state	2026-08-07 06:57:42.765392+00	2026-08-07 07:01:19.623466+00
\.


--
-- Data for Name: workstations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.workstations (id, company_id, workstation_name, hour_rate, created_at) FROM stdin;
\.


--
-- Name: asset_conditions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.asset_conditions_id_seq', 5, true);


--
-- Name: currencies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.currencies_id_seq', 3, true);


--
-- Name: maintenance_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.maintenance_types_id_seq', 9, true);


--
-- Name: units_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.units_id_seq', 10, true);


--
-- Name: _sqlx_migrations _sqlx_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._sqlx_migrations
    ADD CONSTRAINT _sqlx_migrations_pkey PRIMARY KEY (version);


--
-- Name: accounting_periods accounting_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounting_periods
    ADD CONSTRAINT accounting_periods_pkey PRIMARY KEY (id);


--
-- Name: api_credentials api_credentials_api_key_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_credentials
    ADD CONSTRAINT api_credentials_api_key_hash_key UNIQUE (api_key_hash);


--
-- Name: api_credentials api_credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_credentials
    ADD CONSTRAINT api_credentials_pkey PRIMARY KEY (id);


--
-- Name: app_migration_history app_migration_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_migration_history
    ADD CONSTRAINT app_migration_history_pkey PRIMARY KEY (id);


--
-- Name: approval_entity_types approval_entity_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_entity_types
    ADD CONSTRAINT approval_entity_types_pkey PRIMARY KEY (id);


--
-- Name: approval_entity_types approval_entity_types_value_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_entity_types
    ADD CONSTRAINT approval_entity_types_value_key UNIQUE (value);


--
-- Name: approval_histories approval_histories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_histories
    ADD CONSTRAINT approval_histories_pkey PRIMARY KEY (id);


--
-- Name: approval_requests approval_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_requests
    ADD CONSTRAINT approval_requests_pkey PRIMARY KEY (id);


--
-- Name: approval_workflows approval_workflows_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_workflows
    ADD CONSTRAINT approval_workflows_pkey PRIMARY KEY (id);


--
-- Name: asset_conditions asset_conditions_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_conditions
    ADD CONSTRAINT asset_conditions_code_key UNIQUE (code);


--
-- Name: asset_conditions asset_conditions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_conditions
    ADD CONSTRAINT asset_conditions_pkey PRIMARY KEY (id);


--
-- Name: asset_conversions asset_conversions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_conversions
    ADD CONSTRAINT asset_conversions_pkey PRIMARY KEY (id);


--
-- Name: asset_conversions asset_conversions_request_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_conversions
    ADD CONSTRAINT asset_conversions_request_number_key UNIQUE (request_number);


--
-- Name: asset_custody_history asset_custody_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_custody_history
    ADD CONSTRAINT asset_custody_history_pkey PRIMARY KEY (id);


--
-- Name: asset_depreciation_logs asset_depreciation_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_depreciation_logs
    ADD CONSTRAINT asset_depreciation_logs_pkey PRIMARY KEY (id);


--
-- Name: asset_documents asset_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_documents
    ADD CONSTRAINT asset_documents_pkey PRIMARY KEY (id);


--
-- Name: asset_expense_items asset_expense_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_expense_items
    ADD CONSTRAINT asset_expense_items_pkey PRIMARY KEY (id);


--
-- Name: asset_expenses asset_expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_expenses
    ADD CONSTRAINT asset_expenses_pkey PRIMARY KEY (id);


--
-- Name: asset_history asset_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_history
    ADD CONSTRAINT asset_history_pkey PRIMARY KEY (id);


--
-- Name: asset_lifecycle_history asset_lifecycle_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_lifecycle_history
    ADD CONSTRAINT asset_lifecycle_history_pkey PRIMARY KEY (id);


--
-- Name: asset_loans asset_loans_loan_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_loans
    ADD CONSTRAINT asset_loans_loan_number_key UNIQUE (loan_number);


--
-- Name: asset_loans asset_loans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_loans
    ADD CONSTRAINT asset_loans_pkey PRIMARY KEY (id);


--
-- Name: asset_specification_history asset_specification_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_specification_history
    ADD CONSTRAINT asset_specification_history_pkey PRIMARY KEY (id);


--
-- Name: asset_tax_renewals asset_tax_renewals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_tax_renewals
    ADD CONSTRAINT asset_tax_renewals_pkey PRIMARY KEY (id);


--
-- Name: asset_valuations asset_valuations_asset_id_valuation_date_valuation_type_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_valuations
    ADD CONSTRAINT asset_valuations_asset_id_valuation_date_valuation_type_key UNIQUE (asset_id, valuation_date, valuation_type);


--
-- Name: asset_valuations asset_valuations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_valuations
    ADD CONSTRAINT asset_valuations_pkey PRIMARY KEY (id);


--
-- Name: assets assets_asset_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_asset_code_key UNIQUE (asset_code);


--
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (id);


--
-- Name: attendance_records attendance_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: audit_records audit_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_records
    ADD CONSTRAINT audit_records_pkey PRIMARY KEY (id);


--
-- Name: audit_sessions audit_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_sessions
    ADD CONSTRAINT audit_sessions_pkey PRIMARY KEY (id);


--
-- Name: bins bins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bins
    ADD CONSTRAINT bins_pkey PRIMARY KEY (id);


--
-- Name: bom_items bom_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bom_items
    ADD CONSTRAINT bom_items_pkey PRIMARY KEY (id);


--
-- Name: boms boms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.boms
    ADD CONSTRAINT boms_pkey PRIMARY KEY (id);


--
-- Name: building_details building_details_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.building_details
    ADD CONSTRAINT building_details_pkey PRIMARY KEY (asset_id);


--
-- Name: cash_bank_transactions cash_bank_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_bank_transactions
    ADD CONSTRAINT cash_bank_transactions_pkey PRIMARY KEY (id);


--
-- Name: cash_bank_transactions cash_bank_transactions_transaction_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_bank_transactions
    ADD CONSTRAINT cash_bank_transactions_transaction_number_key UNIQUE (transaction_number);


--
-- Name: categories categories_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_code_key UNIQUE (code);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: category_attribute_templates category_attribute_templates_category_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.category_attribute_templates
    ADD CONSTRAINT category_attribute_templates_category_id_key UNIQUE (category_id);


--
-- Name: category_attribute_templates category_attribute_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.category_attribute_templates
    ADD CONSTRAINT category_attribute_templates_pkey PRIMARY KEY (id);


--
-- Name: chart_of_accounts chart_of_accounts_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT chart_of_accounts_code_key UNIQUE (code);


--
-- Name: chart_of_accounts chart_of_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT chart_of_accounts_pkey PRIMARY KEY (id);


--
-- Name: client_contacts client_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_contacts
    ADD CONSTRAINT client_contacts_pkey PRIMARY KEY (id);


--
-- Name: clients clients_client_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_client_code_key UNIQUE (client_code);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: commercial_contracts commercial_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commercial_contracts
    ADD CONSTRAINT commercial_contracts_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: contract_approvals contract_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_approvals
    ADD CONSTRAINT contract_approvals_pkey PRIMARY KEY (id);


--
-- Name: contract_documents contract_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_documents
    ADD CONSTRAINT contract_documents_pkey PRIMARY KEY (id);


--
-- Name: contract_renewals contract_renewals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_renewals
    ADD CONSTRAINT contract_renewals_pkey PRIMARY KEY (id);


--
-- Name: contract_templates contract_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_templates
    ADD CONSTRAINT contract_templates_pkey PRIMARY KEY (id);


--
-- Name: cost_centers cost_centers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cost_centers
    ADD CONSTRAINT cost_centers_pkey PRIMARY KEY (id);


--
-- Name: currencies currencies_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.currencies
    ADD CONSTRAINT currencies_code_key UNIQUE (code);


--
-- Name: currencies currencies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.currencies
    ADD CONSTRAINT currencies_pkey PRIMARY KEY (id);


--
-- Name: custom_docperms custom_docperms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_docperms
    ADD CONSTRAINT custom_docperms_pkey PRIMARY KEY (id);


--
-- Name: data_import_logs data_import_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_import_logs
    ADD CONSTRAINT data_import_logs_pkey PRIMARY KEY (id);


--
-- Name: data_imports data_imports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_imports
    ADD CONSTRAINT data_imports_pkey PRIMARY KEY (id);


--
-- Name: data_migration_logs data_migration_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_migration_logs
    ADD CONSTRAINT data_migration_logs_pkey PRIMARY KEY (id);


--
-- Name: departments departments_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_code_key UNIQUE (code);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: depreciation_schedules depreciation_schedules_asset_id_period_start_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.depreciation_schedules
    ADD CONSTRAINT depreciation_schedules_asset_id_period_start_key UNIQUE (asset_id, period_start);


--
-- Name: depreciation_schedules depreciation_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.depreciation_schedules
    ADD CONSTRAINT depreciation_schedules_pkey PRIMARY KEY (id);


--
-- Name: doctypes doctypes_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.doctypes
    ADD CONSTRAINT doctypes_name_key UNIQUE (name);


--
-- Name: doctypes doctypes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.doctypes
    ADD CONSTRAINT doctypes_pkey PRIMARY KEY (id);


--
-- Name: document_audit_trail document_audit_trail_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_audit_trail
    ADD CONSTRAINT document_audit_trail_pkey PRIMARY KEY (id);


--
-- Name: employee_evaluations employee_evaluations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_evaluations
    ADD CONSTRAINT employee_evaluations_pkey PRIMARY KEY (id);


--
-- Name: employees employees_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_email_key UNIQUE (email);


--
-- Name: employees employees_nik_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_nik_key UNIQUE (nik);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: entity_types entity_types_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key UNIQUE (name);


--
-- Name: entity_types entity_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_pkey PRIMARY KEY (id);


--
-- Name: expense_items expense_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_items
    ADD CONSTRAINT expense_items_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_expense_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_expense_number_key UNIQUE (expense_number);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: face_photos face_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.face_photos
    ADD CONSTRAINT face_photos_pkey PRIMARY KEY (id);


--
-- Name: field_definitions field_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.field_definitions
    ADD CONSTRAINT field_definitions_pkey PRIMARY KEY (id);


--
-- Name: fiscal_years fiscal_years_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fiscal_years
    ADD CONSTRAINT fiscal_years_pkey PRIMARY KEY (id);


--
-- Name: fuel_logs fuel_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fuel_logs
    ADD CONSTRAINT fuel_logs_pkey PRIMARY KEY (id);


--
-- Name: fuel_logs fuel_logs_tracking_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fuel_logs
    ADD CONSTRAINT fuel_logs_tracking_number_key UNIQUE (tracking_number);


--
-- Name: furniture_details furniture_details_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.furniture_details
    ADD CONSTRAINT furniture_details_pkey PRIMARY KEY (asset_id);


--
-- Name: gl_entries gl_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gl_entries
    ADD CONSTRAINT gl_entries_pkey PRIMARY KEY (id);


--
-- Name: heavy_equipment_details heavy_equipment_details_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.heavy_equipment_details
    ADD CONSTRAINT heavy_equipment_details_pkey PRIMARY KEY (asset_id);


--
-- Name: id_tax_invoices id_tax_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.id_tax_invoices
    ADD CONSTRAINT id_tax_invoices_pkey PRIMARY KEY (id);


--
-- Name: id_withholding_certificates id_withholding_certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.id_withholding_certificates
    ADD CONSTRAINT id_withholding_certificates_pkey PRIMARY KEY (id);


--
-- Name: idempotency_log idempotency_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.idempotency_log
    ADD CONSTRAINT idempotency_log_pkey PRIMARY KEY (idempotency_key);


--
-- Name: installed_apps installed_apps_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.installed_apps
    ADD CONSTRAINT installed_apps_pkey PRIMARY KEY (app_name);


--
-- Name: insurances insurances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insurances
    ADD CONSTRAINT insurances_pkey PRIMARY KEY (id);


--
-- Name: inventory_categories inventory_categories_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_categories
    ADD CONSTRAINT inventory_categories_code_key UNIQUE (code);


--
-- Name: inventory_categories inventory_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_categories
    ADD CONSTRAINT inventory_categories_pkey PRIMARY KEY (id);


--
-- Name: inventory_details inventory_details_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_details
    ADD CONSTRAINT inventory_details_pkey PRIMARY KEY (asset_id);


--
-- Name: inventory_documents inventory_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_documents
    ADD CONSTRAINT inventory_documents_pkey PRIMARY KEY (id);


--
-- Name: inventory_items inventory_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);


--
-- Name: inventory_items inventory_items_sku_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_sku_key UNIQUE (sku);


--
-- Name: inventory_movements inventory_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_pkey PRIMARY KEY (id);


--
-- Name: journal_entries journal_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_pkey PRIMARY KEY (id);


--
-- Name: journal_entries journal_entries_transaction_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_transaction_number_key UNIQUE (transaction_number);


--
-- Name: journal_lines journal_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journal_lines
    ADD CONSTRAINT journal_lines_pkey PRIMARY KEY (id);


--
-- Name: land_details land_details_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.land_details
    ADD CONSTRAINT land_details_pkey PRIMARY KEY (asset_id);


--
-- Name: landed_cost_vouchers landed_cost_vouchers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.landed_cost_vouchers
    ADD CONSTRAINT landed_cost_vouchers_pkey PRIMARY KEY (id);


--
-- Name: layout_definitions layout_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.layout_definitions
    ADD CONSTRAINT layout_definitions_pkey PRIMARY KEY (id);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: leave_requests leave_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_pkey PRIMARY KEY (id);


--
-- Name: locations locations_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_code_key UNIQUE (code);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: machine_details machine_details_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.machine_details
    ADD CONSTRAINT machine_details_pkey PRIMARY KEY (asset_id);


--
-- Name: maintenance_checklists maintenance_checklists_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_checklists
    ADD CONSTRAINT maintenance_checklists_pkey PRIMARY KEY (id);


--
-- Name: maintenance_records maintenance_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_records
    ADD CONSTRAINT maintenance_records_pkey PRIMARY KEY (id);


--
-- Name: maintenance_schedules maintenance_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_schedules
    ADD CONSTRAINT maintenance_schedules_pkey PRIMARY KEY (id);


--
-- Name: maintenance_template_tasks maintenance_template_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_template_tasks
    ADD CONSTRAINT maintenance_template_tasks_pkey PRIMARY KEY (id);


--
-- Name: maintenance_templates maintenance_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_templates
    ADD CONSTRAINT maintenance_templates_pkey PRIMARY KEY (id);


--
-- Name: maintenance_types maintenance_types_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_types
    ADD CONSTRAINT maintenance_types_code_key UNIQUE (code);


--
-- Name: maintenance_types maintenance_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_types
    ADD CONSTRAINT maintenance_types_pkey PRIMARY KEY (id);


--
-- Name: maintenance_work_order_parts maintenance_work_order_parts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_work_order_parts
    ADD CONSTRAINT maintenance_work_order_parts_pkey PRIMARY KEY (id);


--
-- Name: maintenance_work_orders maintenance_work_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_work_orders
    ADD CONSTRAINT maintenance_work_orders_pkey PRIMARY KEY (id);


--
-- Name: maintenance_work_orders maintenance_work_orders_wo_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_work_orders
    ADD CONSTRAINT maintenance_work_orders_wo_number_key UNIQUE (wo_number);


--
-- Name: naming_series naming_series_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.naming_series
    ADD CONSTRAINT naming_series_pkey PRIMARY KEY (entity_type, company_id, prefix, year);


--
-- Name: notification_preferences notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_user_id_event_type_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_event_type_key UNIQUE (user_id, event_type);


--
-- Name: notification_preferences notification_preferences_user_id_template_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_template_id_key UNIQUE (user_id, template_id);


--
-- Name: notification_templates notification_templates_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_code_key UNIQUE (code);


--
-- Name: notification_templates notification_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: opening_balance_items opening_balance_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opening_balance_items
    ADD CONSTRAINT opening_balance_items_pkey PRIMARY KEY (id);


--
-- Name: opening_balance_vouchers opening_balance_vouchers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opening_balance_vouchers
    ADD CONSTRAINT opening_balance_vouchers_pkey PRIMARY KEY (id);


--
-- Name: opportunities opportunities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_code_key UNIQUE (code);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: outbox outbox_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.outbox
    ADD CONSTRAINT outbox_pkey PRIMARY KEY (id);


--
-- Name: payroll_slips payroll_slips_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payroll_slips
    ADD CONSTRAINT payroll_slips_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_code_key UNIQUE (code);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: pos_profiles pos_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pos_profiles
    ADD CONSTRAINT pos_profiles_pkey PRIMARY KEY (id);


--
-- Name: pos_shifts pos_shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pos_shifts
    ADD CONSTRAINT pos_shifts_pkey PRIMARY KEY (id);


--
-- Name: preventive_schedules preventive_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.preventive_schedules
    ADD CONSTRAINT preventive_schedules_pkey PRIMARY KEY (id);


--
-- Name: print_templates print_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.print_templates
    ADD CONSTRAINT print_templates_pkey PRIMARY KEY (id);


--
-- Name: production_orders production_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT production_orders_pkey PRIMARY KEY (id);


--
-- Name: project_tasks project_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_tasks
    ADD CONSTRAINT project_tasks_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: purchase_bill_items purchase_bill_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_bill_items
    ADD CONSTRAINT purchase_bill_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_bills purchase_bills_bill_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_bills
    ADD CONSTRAINT purchase_bills_bill_number_key UNIQUE (bill_number);


--
-- Name: purchase_bills purchase_bills_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_bills
    ADD CONSTRAINT purchase_bills_pkey PRIMARY KEY (id);


--
-- Name: purchase_order_items purchase_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_order_number_key UNIQUE (order_number);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: purchase_quote_items purchase_quote_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_quote_items
    ADD CONSTRAINT purchase_quote_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_quotes purchase_quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_quotes
    ADD CONSTRAINT purchase_quotes_pkey PRIMARY KEY (id);


--
-- Name: purchase_quotes purchase_quotes_quote_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_quotes
    ADD CONSTRAINT purchase_quotes_quote_number_key UNIQUE (quote_number);


--
-- Name: purchase_receipt_items purchase_receipt_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_receipt_items
    ADD CONSTRAINT purchase_receipt_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_receipts purchase_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_receipts
    ADD CONSTRAINT purchase_receipts_pkey PRIMARY KEY (id);


--
-- Name: purchase_shipment_items purchase_shipment_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_shipment_items
    ADD CONSTRAINT purchase_shipment_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_shipments purchase_shipments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_shipments
    ADD CONSTRAINT purchase_shipments_pkey PRIMARY KEY (id);


--
-- Name: purchase_shipments purchase_shipments_shipment_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_shipments
    ADD CONSTRAINT purchase_shipments_shipment_number_key UNIQUE (shipment_number);


--
-- Name: quality_inspection_templates quality_inspection_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quality_inspection_templates
    ADD CONSTRAINT quality_inspection_templates_pkey PRIMARY KEY (id);


--
-- Name: quality_inspections quality_inspections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quality_inspections
    ADD CONSTRAINT quality_inspections_pkey PRIMARY KEY (id);


--
-- Name: rental_billing_periods rental_billing_periods_item_period_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rental_billing_periods
    ADD CONSTRAINT rental_billing_periods_item_period_key UNIQUE (rental_item_id, period_start, period_end);


--
-- Name: rental_billing_periods rental_billing_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rental_billing_periods
    ADD CONSTRAINT rental_billing_periods_pkey PRIMARY KEY (id);


--
-- Name: rental_billings rental_billings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rental_billings
    ADD CONSTRAINT rental_billings_pkey PRIMARY KEY (id);


--
-- Name: rental_contracts rental_contracts_contract_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rental_contracts
    ADD CONSTRAINT rental_contracts_contract_number_key UNIQUE (contract_number);


--
-- Name: rental_contracts rental_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rental_contracts
    ADD CONSTRAINT rental_contracts_pkey PRIMARY KEY (id);


--
-- Name: rental_details rental_details_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rental_details
    ADD CONSTRAINT rental_details_pkey PRIMARY KEY (asset_id);


--
-- Name: rental_handovers rental_handovers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rental_handovers
    ADD CONSTRAINT rental_handovers_pkey PRIMARY KEY (id);


--
-- Name: rental_items rental_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rental_items
    ADD CONSTRAINT rental_items_pkey PRIMARY KEY (id);


--
-- Name: rental_rates rental_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rental_rates
    ADD CONSTRAINT rental_rates_pkey PRIMARY KEY (id);


--
-- Name: rental_timesheets rental_timesheets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rental_timesheets
    ADD CONSTRAINT rental_timesheets_pkey PRIMARY KEY (id);


--
-- Name: rental_timesheets rental_timesheets_rental_id_work_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rental_timesheets
    ADD CONSTRAINT rental_timesheets_rental_id_work_date_key UNIQUE (rental_id, work_date);


--
-- Name: rentals rentals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rentals
    ADD CONSTRAINT rentals_pkey PRIMARY KEY (id);


--
-- Name: rentals rentals_rental_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rentals
    ADD CONSTRAINT rentals_rental_number_key UNIQUE (rental_number);


--
-- Name: report_access_log report_access_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_access_log
    ADD CONSTRAINT report_access_log_pkey PRIMARY KEY (id);


--
-- Name: report_definitions report_definitions_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_definitions
    ADD CONSTRAINT report_definitions_code_key UNIQUE (code);


--
-- Name: report_definitions report_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_definitions
    ADD CONSTRAINT report_definitions_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_role_id_permission_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_permission_id_key UNIQUE (role_id, permission_id);


--
-- Name: role_profile_roles role_profile_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_profile_roles
    ADD CONSTRAINT role_profile_roles_pkey PRIMARY KEY (role_profile_id, role_id);


--
-- Name: role_profiles role_profiles_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_profiles
    ADD CONSTRAINT role_profiles_name_key UNIQUE (name);


--
-- Name: role_profiles role_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_profiles
    ADD CONSTRAINT role_profiles_pkey PRIMARY KEY (id);


--
-- Name: roles roles_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_code_key UNIQUE (code);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: sales_invoice_items sales_invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_invoice_items
    ADD CONSTRAINT sales_invoice_items_pkey PRIMARY KEY (id);


--
-- Name: sales_invoices sales_invoices_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_invoice_number_key UNIQUE (invoice_number);


--
-- Name: sales_invoices sales_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_pkey PRIMARY KEY (id);


--
-- Name: sales_order_items sales_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_order_items
    ADD CONSTRAINT sales_order_items_pkey PRIMARY KEY (id);


--
-- Name: sales_orders sales_orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_order_number_key UNIQUE (order_number);


--
-- Name: sales_orders sales_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_pkey PRIMARY KEY (id);


--
-- Name: sales_quote_items sales_quote_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_quote_items
    ADD CONSTRAINT sales_quote_items_pkey PRIMARY KEY (id);


--
-- Name: sales_quotes sales_quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_quotes
    ADD CONSTRAINT sales_quotes_pkey PRIMARY KEY (id);


--
-- Name: sales_quotes sales_quotes_quote_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_quotes
    ADD CONSTRAINT sales_quotes_quote_number_key UNIQUE (quote_number);


--
-- Name: sales_shipment_items sales_shipment_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_shipment_items
    ADD CONSTRAINT sales_shipment_items_pkey PRIMARY KEY (id);


--
-- Name: sales_shipments sales_shipments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_shipments
    ADD CONSTRAINT sales_shipments_pkey PRIMARY KEY (id);


--
-- Name: sales_shipments sales_shipments_shipment_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_shipments
    ADD CONSTRAINT sales_shipments_shipment_number_key UNIQUE (shipment_number);


--
-- Name: saved_reports saved_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_reports
    ADD CONSTRAINT saved_reports_pkey PRIMARY KEY (id);


--
-- Name: sensor_aggregates sensor_aggregates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sensor_aggregates
    ADD CONSTRAINT sensor_aggregates_pkey PRIMARY KEY (asset_id, sensor_id, period_type, period_start);


--
-- Name: sensor_alerts sensor_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sensor_alerts
    ADD CONSTRAINT sensor_alerts_pkey PRIMARY KEY (id);


--
-- Name: sensor_readings sensor_readings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sensor_readings
    ADD CONSTRAINT sensor_readings_pkey PRIMARY KEY ("time", asset_id, sensor_id);


--
-- Name: sensor_thresholds sensor_thresholds_asset_id_sensor_type_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sensor_thresholds
    ADD CONSTRAINT sensor_thresholds_asset_id_sensor_type_key UNIQUE (asset_id, sensor_type);


--
-- Name: sensor_thresholds sensor_thresholds_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sensor_thresholds
    ADD CONSTRAINT sensor_thresholds_pkey PRIMARY KEY (id);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (key);


--
-- Name: stock_ledger_entries stock_ledger_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_ledger_entries
    ADD CONSTRAINT stock_ledger_entries_pkey PRIMARY KEY (id);


--
-- Name: stock_reservations stock_reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_reservations
    ADD CONSTRAINT stock_reservations_pkey PRIMARY KEY (id);


--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);


--
-- Name: system_backup_logs system_backup_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_backup_logs
    ADD CONSTRAINT system_backup_logs_pkey PRIMARY KEY (id);


--
-- Name: system_health_checks system_health_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_health_checks
    ADD CONSTRAINT system_health_checks_pkey PRIMARY KEY (id);


--
-- Name: system_job_locks system_job_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_job_locks
    ADD CONSTRAINT system_job_locks_pkey PRIMARY KEY (job_name);


--
-- Name: tenant_provisioning_logs tenant_provisioning_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_provisioning_logs
    ADD CONSTRAINT tenant_provisioning_logs_pkey PRIMARY KEY (id);


--
-- Name: tenant_provisioning_logs tenant_provisioning_logs_site_domain_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_provisioning_logs
    ADD CONSTRAINT tenant_provisioning_logs_site_domain_key UNIQUE (site_domain);


--
-- Name: timesheets timesheets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timesheets
    ADD CONSTRAINT timesheets_pkey PRIMARY KEY (id);


--
-- Name: companies uk_companies_tenant_code; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT uk_companies_tenant_code UNIQUE (tenant_id, code);


--
-- Name: cost_centers uk_cost_centers_tenant_code; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cost_centers
    ADD CONSTRAINT uk_cost_centers_tenant_code UNIQUE (tenant_id, code);


--
-- Name: contract_documents unique_contract_doc_version; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_documents
    ADD CONSTRAINT unique_contract_doc_version UNIQUE (contract_id, document_type, version);


--
-- Name: units units_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_code_key UNIQUE (code);


--
-- Name: units units_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_pkey PRIMARY KEY (id);


--
-- Name: accounting_periods uq_accounting_period_year_num; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounting_periods
    ADD CONSTRAINT uq_accounting_period_year_num UNIQUE (fiscal_year_id, period_number);


--
-- Name: app_migration_history uq_app_migration; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_migration_history
    ADD CONSTRAINT uq_app_migration UNIQUE (app_name, migration_name);


--
-- Name: bins uq_bin_company_warehouse_item; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bins
    ADD CONSTRAINT uq_bin_company_warehouse_item UNIQUE (company_id, warehouse_id, item_id);


--
-- Name: boms uq_bom_num; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.boms
    ADD CONSTRAINT uq_bom_num UNIQUE (company_id, bom_number);


--
-- Name: custom_docperms uq_docperm_doctype_role_level; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_docperms
    ADD CONSTRAINT uq_docperm_doctype_role_level UNIQUE (doctype_id, role_id, permlevel);


--
-- Name: field_definitions uq_field_def_entity_name; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.field_definitions
    ADD CONSTRAINT uq_field_def_entity_name UNIQUE (entity_type_id, field_name);


--
-- Name: fiscal_years uq_fiscal_year_company_name; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fiscal_years
    ADD CONSTRAINT uq_fiscal_year_company_name UNIQUE (company_id, year_name);


--
-- Name: id_tax_invoices uq_id_tax_inv_num; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.id_tax_invoices
    ADD CONSTRAINT uq_id_tax_inv_num UNIQUE (company_id, tax_invoice_number);


--
-- Name: id_withholding_certificates uq_id_withholding_cert; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.id_withholding_certificates
    ADD CONSTRAINT uq_id_withholding_cert UNIQUE (company_id, certificate_number);


--
-- Name: layout_definitions uq_layout_def_entity_name; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.layout_definitions
    ADD CONSTRAINT uq_layout_def_entity_name UNIQUE (entity_type_id, layout_name);


--
-- Name: print_templates uq_print_template_doc_name; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.print_templates
    ADD CONSTRAINT uq_print_template_doc_name UNIQUE (document_type, template_name);


--
-- Name: production_orders uq_prod_order_num; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT uq_prod_order_num UNIQUE (company_id, production_order_number);


--
-- Name: purchase_receipts uq_purchase_receipt_no; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_receipts
    ADD CONSTRAINT uq_purchase_receipt_no UNIQUE (company_id, receipt_number);


--
-- Name: quality_inspections uq_quality_insp_num; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quality_inspections
    ADD CONSTRAINT uq_quality_insp_num UNIQUE (company_id, inspection_number);


--
-- Name: warehouses uq_warehouse_company_code; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT uq_warehouse_company_code UNIQUE (company_id, code);


--
-- Name: workflow_states uq_workflow_state_name; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_states
    ADD CONSTRAINT uq_workflow_state_name UNIQUE (workflow_id, state_name);


--
-- Name: workflow_transitions uq_workflow_transition; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_transitions
    ADD CONSTRAINT uq_workflow_transition UNIQUE (workflow_id, state_id, action_name);


--
-- Name: user_permissions user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_id_organization_id_key UNIQUE (user_id, role_id, organization_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vehicle_details vehicle_details_license_plate_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_details
    ADD CONSTRAINT vehicle_details_license_plate_key UNIQUE (license_plate);


--
-- Name: vehicle_details vehicle_details_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_details
    ADD CONSTRAINT vehicle_details_pkey PRIMARY KEY (asset_id);


--
-- Name: vendors vendors_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_code_key UNIQUE (code);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: warehouses warehouses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_pkey PRIMARY KEY (id);


--
-- Name: work_experiences work_experiences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_experiences
    ADD CONSTRAINT work_experiences_pkey PRIMARY KEY (id);


--
-- Name: workflow_action_logs workflow_action_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_action_logs
    ADD CONSTRAINT workflow_action_logs_pkey PRIMARY KEY (id);


--
-- Name: workflow_states workflow_states_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_states
    ADD CONSTRAINT workflow_states_pkey PRIMARY KEY (id);


--
-- Name: workflow_transitions workflow_transitions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_transitions
    ADD CONSTRAINT workflow_transitions_pkey PRIMARY KEY (id);


--
-- Name: workflows workflows_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflows
    ADD CONSTRAINT workflows_pkey PRIMARY KEY (id);


--
-- Name: workflows workflows_workflow_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflows
    ADD CONSTRAINT workflows_workflow_name_key UNIQUE (workflow_name);


--
-- Name: workstations workstations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workstations
    ADD CONSTRAINT workstations_pkey PRIMARY KEY (id);


--
-- Name: idx_accounting_periods_dates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_accounting_periods_dates ON public.accounting_periods USING btree (start_date, end_date);


--
-- Name: idx_api_cred_hash; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_api_cred_hash ON public.api_credentials USING btree (api_key_hash);


--
-- Name: idx_api_cred_tenant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_api_cred_tenant ON public.api_credentials USING btree (tenant_id);


--
-- Name: idx_app_migration_app; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_app_migration_app ON public.app_migration_history USING btree (app_name);


--
-- Name: idx_approval_entity_types_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approval_entity_types_is_active ON public.approval_entity_types USING btree (is_active);


--
-- Name: idx_approval_entity_types_value; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approval_entity_types_value ON public.approval_entity_types USING btree (value);


--
-- Name: idx_approval_histories_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approval_histories_action ON public.approval_histories USING btree (action);


--
-- Name: idx_approval_histories_actor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approval_histories_actor ON public.approval_histories USING btree (actor_id);


--
-- Name: idx_approval_histories_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approval_histories_created ON public.approval_histories USING btree (created_at DESC);


--
-- Name: idx_approval_histories_request; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approval_histories_request ON public.approval_histories USING btree (approval_request_id);


--
-- Name: idx_approval_requests_approved_by_l3; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approval_requests_approved_by_l3 ON public.approval_requests USING btree (approved_by_l3);


--
-- Name: idx_approval_requests_approved_by_l4; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approval_requests_approved_by_l4 ON public.approval_requests USING btree (approved_by_l4);


--
-- Name: idx_approval_requests_approved_by_l5; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approval_requests_approved_by_l5 ON public.approval_requests USING btree (approved_by_l5);


--
-- Name: idx_approval_requests_delegated_to; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approval_requests_delegated_to ON public.approval_requests USING btree (delegated_to);


--
-- Name: idx_approval_requests_escalated_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approval_requests_escalated_at ON public.approval_requests USING btree (escalated_at);


--
-- Name: idx_approval_requests_module_callback; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approval_requests_module_callback ON public.approval_requests USING btree (module_callback);


--
-- Name: idx_approval_workflows_entity_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approval_workflows_entity_type ON public.approval_workflows USING btree (entity_type);


--
-- Name: idx_asset_conversions_asset_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_asset_conversions_asset_id ON public.asset_conversions USING btree (asset_id);


--
-- Name: idx_asset_conversions_request_no; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_asset_conversions_request_no ON public.asset_conversions USING btree (request_number);


--
-- Name: idx_asset_conversions_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_asset_conversions_status ON public.asset_conversions USING btree (status);


--
-- Name: idx_asset_custody_asset; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_asset_custody_asset ON public.asset_custody_history USING btree (asset_id);


--
-- Name: idx_asset_custody_custodian; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_asset_custody_custodian ON public.asset_custody_history USING btree (custodian_user_id);


--
-- Name: idx_asset_documents_asset; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_asset_documents_asset ON public.asset_documents USING btree (asset_id);


--
-- Name: idx_asset_documents_expiry; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_asset_documents_expiry ON public.asset_documents USING btree (expiry_date);


--
-- Name: idx_asset_expense_items_expense_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_asset_expense_items_expense_id ON public.asset_expense_items USING btree (expense_id);


--
-- Name: idx_asset_expenses_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_asset_expenses_type ON public.asset_expenses USING btree (expense_type);


--
-- Name: idx_asset_history_asset; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_asset_history_asset ON public.asset_history USING btree (asset_id);


--
-- Name: idx_asset_loans_asset; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_asset_loans_asset ON public.asset_loans USING btree (asset_id);


--
-- Name: idx_asset_loans_borrower; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_asset_loans_borrower ON public.asset_loans USING btree (borrower_id);


--
-- Name: idx_asset_loans_dates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_asset_loans_dates ON public.asset_loans USING btree (loan_date, expected_return_date);


--
-- Name: idx_asset_loans_employee; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_asset_loans_employee ON public.asset_loans USING btree (employee_id);


--
-- Name: idx_asset_loans_overdue; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_asset_loans_overdue ON public.asset_loans USING btree (expected_return_date) WHERE ((actual_return_date IS NULL) AND ((status)::text <> ALL ((ARRAY['returned'::character varying, 'lost'::character varying, 'rejected'::character varying])::text[])));


--
-- Name: idx_asset_loans_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_asset_loans_status ON public.asset_loans USING btree (status);


--
-- Name: idx_asset_tax_renewals_asset_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_asset_tax_renewals_asset_id ON public.asset_tax_renewals USING btree (asset_id);


--
-- Name: idx_asset_tax_renewals_doc_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_asset_tax_renewals_doc_type ON public.asset_tax_renewals USING btree (document_type);


--
-- Name: idx_asset_tax_renewals_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_asset_tax_renewals_status ON public.asset_tax_renewals USING btree (status);


--
-- Name: idx_asset_valuations_asset; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_asset_valuations_asset ON public.asset_valuations USING btree (asset_id);


--
-- Name: idx_asset_valuations_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_asset_valuations_date ON public.asset_valuations USING btree (valuation_date);


--
-- Name: idx_assets_assigned_to; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assets_assigned_to ON public.assets USING btree (assigned_to);


--
-- Name: idx_assets_brand_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assets_brand_trgm ON public.assets USING gin (brand public.gin_trgm_ops);


--
-- Name: idx_assets_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assets_category ON public.assets USING btree (category_id);


--
-- Name: idx_assets_category_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assets_category_status ON public.assets USING btree (category_id, status);


--
-- Name: idx_assets_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assets_code ON public.assets USING btree (asset_code);


--
-- Name: idx_assets_code_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assets_code_trgm ON public.assets USING gin (asset_code public.gin_trgm_ops);


--
-- Name: idx_assets_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assets_company_id ON public.assets USING btree (company_id);


--
-- Name: idx_assets_created_at_desc; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assets_created_at_desc ON public.assets USING btree (created_at DESC);


--
-- Name: idx_assets_department; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assets_department ON public.assets USING btree (department_id);


--
-- Name: idx_assets_department_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assets_department_id ON public.assets USING btree (department_id);


--
-- Name: idx_assets_is_fuel; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assets_is_fuel ON public.assets USING btree (is_fuel);


--
-- Name: idx_assets_location; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assets_location ON public.assets USING btree (location_id);


--
-- Name: idx_assets_location_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assets_location_status ON public.assets USING btree (location_id, status);


--
-- Name: idx_assets_model_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assets_model_trgm ON public.assets USING gin (model public.gin_trgm_ops);


--
-- Name: idx_assets_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assets_name ON public.assets USING btree (name);


--
-- Name: idx_assets_name_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assets_name_trgm ON public.assets USING gin (name public.gin_trgm_ops);


--
-- Name: idx_assets_notes_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assets_notes_trgm ON public.assets USING gin (notes public.gin_trgm_ops);


--
-- Name: idx_assets_organization; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assets_organization ON public.assets USING btree (organization_id);


--
-- Name: idx_assets_serial_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assets_serial_number ON public.assets USING btree (serial_number);


--
-- Name: idx_assets_serial_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assets_serial_trgm ON public.assets USING gin (serial_number public.gin_trgm_ops);


--
-- Name: idx_assets_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assets_status ON public.assets USING btree (status);


--
-- Name: idx_assets_status_category_composite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assets_status_category_composite ON public.assets USING btree (status, category_id);


--
-- Name: idx_assets_vendor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assets_vendor ON public.assets USING btree (vendor_id);


--
-- Name: idx_attendance_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attendance_date ON public.attendance_records USING btree (check_in_time);


--
-- Name: idx_attendance_employee; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attendance_employee ON public.attendance_records USING btree (employee_id);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_created ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_entity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_entity ON public.audit_logs USING btree (record_id);


--
-- Name: idx_audit_logs_record; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_record ON public.audit_logs USING btree (record_id);


--
-- Name: idx_audit_logs_record_id_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_record_id_created_at ON public.audit_logs USING btree (record_id, created_at DESC);


--
-- Name: idx_audit_logs_table; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_table ON public.audit_logs USING btree (table_name);


--
-- Name: idx_audit_logs_table_record; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_table_record ON public.audit_logs USING btree (table_name, record_id);


--
-- Name: idx_audit_logs_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_user ON public.audit_logs USING btree (user_id);


--
-- Name: idx_audit_records_session_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_records_session_id ON public.audit_records USING btree (session_id);


--
-- Name: idx_audit_sessions_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_sessions_status ON public.audit_sessions USING btree (status);


--
-- Name: idx_audit_table_record; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_table_record ON public.audit_logs USING btree (table_name, record_id);


--
-- Name: idx_backup_logs_tenant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_backup_logs_tenant ON public.system_backup_logs USING btree (tenant_id);


--
-- Name: idx_bins_item; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bins_item ON public.bins USING btree (item_id);


--
-- Name: idx_bins_warehouse_item; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bins_warehouse_item ON public.bins USING btree (warehouse_id, item_id);


--
-- Name: idx_cash_bank_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cash_bank_date ON public.cash_bank_transactions USING btree (date);


--
-- Name: idx_categories_accum_depr_account; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_categories_accum_depr_account ON public.categories USING btree (accumulated_depreciation_account_id);


--
-- Name: idx_categories_asset_account; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_categories_asset_account ON public.categories USING btree (asset_account_id);


--
-- Name: idx_categories_display_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_categories_display_order ON public.categories USING btree (display_order);


--
-- Name: idx_categories_expense_account; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_categories_expense_account ON public.categories USING btree (expense_account_id);


--
-- Name: idx_categories_main_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_categories_main_category ON public.categories USING btree (main_category);


--
-- Name: idx_checklists_work_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_checklists_work_order ON public.maintenance_checklists USING btree (work_order_id);


--
-- Name: idx_client_contacts_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_client_contacts_active ON public.client_contacts USING btree (is_active);


--
-- Name: idx_client_contacts_client; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_client_contacts_client ON public.client_contacts USING btree (client_id);


--
-- Name: idx_clients_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clients_active ON public.clients USING btree (is_active);


--
-- Name: idx_clients_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clients_code ON public.clients USING btree (client_code);


--
-- Name: idx_clients_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clients_name ON public.clients USING btree (name);


--
-- Name: idx_coa_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_coa_code ON public.chart_of_accounts USING btree (code);


--
-- Name: idx_coa_parent_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_coa_parent_id ON public.chart_of_accounts USING btree (parent_id);


--
-- Name: idx_companies_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_companies_status ON public.companies USING btree (status);


--
-- Name: idx_companies_tenant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_companies_tenant_id ON public.companies USING btree (tenant_id);


--
-- Name: idx_contract_approvals_approver; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contract_approvals_approver ON public.contract_approvals USING btree (approver_id);


--
-- Name: idx_contract_approvals_contract; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contract_approvals_contract ON public.contract_approvals USING btree (contract_id);


--
-- Name: idx_contract_approvals_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contract_approvals_created ON public.contract_approvals USING btree (created_at DESC);


--
-- Name: idx_contract_documents_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contract_documents_active ON public.contract_documents USING btree (contract_id, is_active) WHERE (is_active = true);


--
-- Name: idx_contract_documents_contract_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contract_documents_contract_id ON public.contract_documents USING btree (contract_id);


--
-- Name: idx_contract_documents_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contract_documents_type ON public.contract_documents USING btree (contract_id, document_type);


--
-- Name: idx_contract_renewals_new; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contract_renewals_new ON public.contract_renewals USING btree (new_contract_id);


--
-- Name: idx_contract_renewals_original; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contract_renewals_original ON public.contract_renewals USING btree (original_contract_id);


--
-- Name: idx_contract_renewals_renewed_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contract_renewals_renewed_at ON public.contract_renewals USING btree (renewed_at);


--
-- Name: idx_contracts_client; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contracts_client ON public.rental_contracts USING btree (client_id);


--
-- Name: idx_contracts_dates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contracts_dates ON public.rental_contracts USING btree (start_date, end_date);


--
-- Name: idx_contracts_expiring; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contracts_expiring ON public.rental_contracts USING btree (end_date) WHERE ((status)::text = ANY ((ARRAY['active'::character varying, 'expiring'::character varying])::text[]));


--
-- Name: idx_contracts_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contracts_status ON public.rental_contracts USING btree (status);


--
-- Name: idx_contracts_template; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contracts_template ON public.rental_contracts USING btree (template_id);


--
-- Name: idx_conversions_asset; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversions_asset ON public.asset_conversions USING btree (asset_id);


--
-- Name: idx_conversions_request_no; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversions_request_no ON public.asset_conversions USING btree (request_number);


--
-- Name: idx_conversions_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversions_status ON public.asset_conversions USING btree (status);


--
-- Name: idx_cost_centers_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cost_centers_company_id ON public.cost_centers USING btree (company_id);


--
-- Name: idx_cost_centers_parent_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cost_centers_parent_id ON public.cost_centers USING btree (parent_id);


--
-- Name: idx_cost_centers_tenant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cost_centers_tenant_id ON public.cost_centers USING btree (tenant_id);


--
-- Name: idx_data_import_logs_import_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_data_import_logs_import_id ON public.data_import_logs USING btree (data_import_id);


--
-- Name: idx_data_imports_doctype; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_data_imports_doctype ON public.data_imports USING btree (doctype_name);


--
-- Name: idx_data_mig_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_data_mig_name ON public.data_migration_logs USING btree (migration_name, step_number);


--
-- Name: idx_depreciation_asset_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_depreciation_asset_id ON public.asset_depreciation_logs USING btree (asset_id);


--
-- Name: idx_depreciation_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_depreciation_period ON public.asset_depreciation_logs USING btree (period_year, period_month);


--
-- Name: idx_depreciation_schedules_asset; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_depreciation_schedules_asset ON public.depreciation_schedules USING btree (asset_id);


--
-- Name: idx_depreciation_schedules_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_depreciation_schedules_period ON public.depreciation_schedules USING btree (period_start, period_end);


--
-- Name: idx_doc_audit_actor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_doc_audit_actor ON public.document_audit_trail USING btree (actor_id, recorded_at);


--
-- Name: idx_doc_audit_document; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_doc_audit_document ON public.document_audit_trail USING btree (document_id, recorded_at);


--
-- Name: idx_doc_audit_tenant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_doc_audit_tenant ON public.document_audit_trail USING btree (tenant_id, recorded_at);


--
-- Name: idx_employees_assigned_asset; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_employees_assigned_asset ON public.employees USING btree (assigned_asset_id);


--
-- Name: idx_employees_department; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_employees_department ON public.employees USING btree (department_id);


--
-- Name: idx_employees_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_employees_email ON public.employees USING btree (email);


--
-- Name: idx_employees_name_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_employees_name_trgm ON public.employees USING gin (name public.gin_trgm_ops);


--
-- Name: idx_employees_nik; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_employees_nik ON public.employees USING btree (nik);


--
-- Name: idx_employees_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_employees_user_id ON public.employees USING btree (user_id);


--
-- Name: idx_employees_work_area; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_employees_work_area ON public.employees USING btree (work_area_id);


--
-- Name: idx_evaluations_employee; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evaluations_employee ON public.employee_evaluations USING btree (employee_id);


--
-- Name: idx_evaluations_year; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evaluations_year ON public.employee_evaluations USING btree (year);


--
-- Name: idx_expenses_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_date ON public.expenses USING btree (date);


--
-- Name: idx_expenses_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_type ON public.expenses USING btree (expense_type);


--
-- Name: idx_face_photos_employee; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_face_photos_employee ON public.face_photos USING btree (employee_id);


--
-- Name: idx_field_defs_entity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_field_defs_entity ON public.field_definitions USING btree (entity_type_id);


--
-- Name: idx_fiscal_years_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_fiscal_years_company ON public.fiscal_years USING btree (company_id);


--
-- Name: idx_fuel_logs_asset; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_fuel_logs_asset ON public.fuel_logs USING btree (asset_id);


--
-- Name: idx_fuel_logs_coupon; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_fuel_logs_coupon ON public.fuel_logs USING btree (coupon_code);


--
-- Name: idx_fuel_logs_requester; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_fuel_logs_requester ON public.fuel_logs USING btree (requested_by);


--
-- Name: idx_fuel_logs_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_fuel_logs_status ON public.fuel_logs USING btree (status);


--
-- Name: idx_gl_entries_company_account_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gl_entries_company_account_date ON public.gl_entries USING btree (company_id, account_id, posting_date);


--
-- Name: idx_gl_entries_posting_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gl_entries_posting_date ON public.gl_entries USING btree (posting_date);


--
-- Name: idx_gl_entries_voucher; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gl_entries_voucher ON public.gl_entries USING btree (voucher_type, voucher_id);


--
-- Name: idx_id_tax_inv_comp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_id_tax_inv_comp ON public.id_tax_invoices USING btree (company_id);


--
-- Name: idx_id_withholding_comp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_id_withholding_comp ON public.id_withholding_certificates USING btree (company_id);


--
-- Name: idx_idempotency_log_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_idempotency_log_created_at ON public.idempotency_log USING btree (created_at);


--
-- Name: idx_idempotency_log_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_idempotency_log_source ON public.idempotency_log USING btree (source_type, source_id);


--
-- Name: idx_insurances_asset; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_insurances_asset ON public.insurances USING btree (asset_id);


--
-- Name: idx_insurances_expiry; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_insurances_expiry ON public.insurances USING btree (end_date);


--
-- Name: idx_inv_docs_item; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inv_docs_item ON public.inventory_documents USING btree (item_id);


--
-- Name: idx_inv_docs_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inv_docs_type ON public.inventory_documents USING btree (type);


--
-- Name: idx_inv_items_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inv_items_category ON public.inventory_items USING btree (category_id);


--
-- Name: idx_inv_items_sku; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inv_items_sku ON public.inventory_items USING btree (sku);


--
-- Name: idx_inv_movements_item; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inv_movements_item ON public.inventory_movements USING btree (item_id);


--
-- Name: idx_inv_movements_ref; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inv_movements_ref ON public.inventory_movements USING btree (reference_number);


--
-- Name: idx_inventory_items_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_items_company_id ON public.inventory_items USING btree (company_id);


--
-- Name: idx_job_locks_expires; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_job_locks_expires ON public.system_job_locks USING btree (expires_at);


--
-- Name: idx_journal_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_journal_date ON public.journal_entries USING btree (date);


--
-- Name: idx_journal_lines_account; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_journal_lines_account ON public.journal_lines USING btree (account_id);


--
-- Name: idx_journal_lines_entry; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_journal_lines_entry ON public.journal_lines USING btree (journal_entry_id);


--
-- Name: idx_journal_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_journal_number ON public.journal_entries USING btree (transaction_number);


--
-- Name: idx_leave_employee; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leave_employee ON public.leave_requests USING btree (employee_id);


--
-- Name: idx_leave_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leave_status ON public.leave_requests USING btree (status);


--
-- Name: idx_lifecycle_history_asset; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lifecycle_history_asset ON public.asset_lifecycle_history USING btree (asset_id);


--
-- Name: idx_lifecycle_history_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lifecycle_history_created ON public.asset_lifecycle_history USING btree (created_at DESC);


--
-- Name: idx_maintenance_approval_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_maintenance_approval_status ON public.maintenance_records USING btree (approval_status);


--
-- Name: idx_maintenance_asset; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_maintenance_asset ON public.maintenance_records USING btree (asset_id);


--
-- Name: idx_maintenance_asset_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_maintenance_asset_status ON public.maintenance_records USING btree (asset_id, status);


--
-- Name: idx_maintenance_assigned_to; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_maintenance_assigned_to ON public.maintenance_records USING btree (assigned_to);


--
-- Name: idx_maintenance_schedules_asset; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_maintenance_schedules_asset ON public.maintenance_schedules USING btree (asset_id);


--
-- Name: idx_maintenance_schedules_next_run; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_maintenance_schedules_next_run ON public.maintenance_schedules USING btree (next_run_date) WHERE (is_active = true);


--
-- Name: idx_maintenance_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_maintenance_status ON public.maintenance_records USING btree (status);


--
-- Name: idx_maintenance_template_tasks_template_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_maintenance_template_tasks_template_id ON public.maintenance_template_tasks USING btree (template_id);


--
-- Name: idx_maintenance_templates_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_maintenance_templates_category ON public.maintenance_templates USING btree (asset_category_id);


--
-- Name: idx_maintenance_templates_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_maintenance_templates_is_active ON public.maintenance_templates USING btree (is_active);


--
-- Name: idx_maintenance_templates_parent_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_maintenance_templates_parent_id ON public.maintenance_templates USING btree (parent_id);


--
-- Name: idx_maintenance_work_orders_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_maintenance_work_orders_company_id ON public.maintenance_work_orders USING btree (company_id);


--
-- Name: idx_naming_series_lookup; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_naming_series_lookup ON public.naming_series USING btree (entity_type, company_id, year);


--
-- Name: idx_notification_preferences_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notification_preferences_user ON public.notification_preferences USING btree (user_id);


--
-- Name: idx_notifications_entity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_entity ON public.notifications USING btree (entity_type, entity_id);


--
-- Name: idx_notifications_unread; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_unread ON public.notifications USING btree (user_id, is_read) WHERE (is_read = false);


--
-- Name: idx_notifications_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id);


--
-- Name: idx_notifications_user_unread; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id) WHERE (is_read = false);


--
-- Name: idx_ob_items_voucher; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ob_items_voucher ON public.opening_balance_items USING btree (voucher_id);


--
-- Name: idx_ob_voucher_comp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ob_voucher_comp ON public.opening_balance_vouchers USING btree (company_id);


--
-- Name: idx_organizations_manager; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_organizations_manager ON public.organizations USING btree (manager_id);


--
-- Name: idx_organizations_parent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_organizations_parent ON public.organizations USING btree (parent_id);


--
-- Name: idx_outbox_dispatch; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_outbox_dispatch ON public.outbox USING btree (status, next_attempt_at) WHERE (status = ANY (ARRAY['PENDING'::text, 'FAILED'::text]));


--
-- Name: idx_outbox_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_outbox_source ON public.outbox USING btree (source_type, source_id);


--
-- Name: idx_outbox_tenant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_outbox_tenant ON public.outbox USING btree (tenant_id, created_at);


--
-- Name: idx_pr_company_po; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pr_company_po ON public.purchase_receipts USING btree (company_id, purchase_order_id);


--
-- Name: idx_preventive_schedule_asset; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_preventive_schedule_asset ON public.preventive_schedules USING btree (asset_id);


--
-- Name: idx_preventive_schedule_next_due; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_preventive_schedule_next_due ON public.preventive_schedules USING btree (next_due_date);


--
-- Name: idx_pri_receipt; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pri_receipt ON public.purchase_receipt_items USING btree (receipt_id);


--
-- Name: idx_purchase_bills_budget_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_purchase_bills_budget_type ON public.purchase_bills USING btree (budget_type);


--
-- Name: idx_purchase_bills_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_purchase_bills_company_id ON public.purchase_bills USING btree (company_id);


--
-- Name: idx_purchase_bills_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_purchase_bills_date ON public.purchase_bills USING btree (date);


--
-- Name: idx_purchase_bills_vendor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_purchase_bills_vendor ON public.purchase_bills USING btree (vendor_id);


--
-- Name: idx_rbp_rental_item; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rbp_rental_item ON public.rental_billing_periods USING btree (rental_item_id);


--
-- Name: idx_rental_billing_invoice; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rental_billing_invoice ON public.rental_billing_periods USING btree (invoice_number);


--
-- Name: idx_rental_billing_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rental_billing_period ON public.rental_billing_periods USING btree (period_start, period_end);


--
-- Name: idx_rental_billing_rental; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rental_billing_rental ON public.rental_billing_periods USING btree (rental_id);


--
-- Name: idx_rental_billing_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rental_billing_status ON public.rental_billing_periods USING btree (status);


--
-- Name: idx_rental_billings_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rental_billings_period ON public.rental_billings USING btree (period_start, period_end);


--
-- Name: idx_rental_billings_rental_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rental_billings_rental_id ON public.rental_billings USING btree (rental_id);


--
-- Name: idx_rental_billings_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rental_billings_status ON public.rental_billings USING btree (status);


--
-- Name: idx_rental_contracts_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rental_contracts_company_id ON public.rental_contracts USING btree (company_id);


--
-- Name: idx_rental_handovers_rental; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rental_handovers_rental ON public.rental_handovers USING btree (rental_id);


--
-- Name: idx_rental_handovers_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rental_handovers_type ON public.rental_handovers USING btree (handover_type);


--
-- Name: idx_rental_items_asset; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rental_items_asset ON public.rental_items USING btree (asset_id);


--
-- Name: idx_rental_items_asset_status_composite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rental_items_asset_status_composite ON public.rental_items USING btree (asset_id, status);


--
-- Name: idx_rental_items_rental; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rental_items_rental ON public.rental_items USING btree (rental_id);


--
-- Name: idx_rental_items_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rental_items_status ON public.rental_items USING btree (status);


--
-- Name: idx_rental_rates_asset; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rental_rates_asset ON public.rental_rates USING btree (asset_id);


--
-- Name: idx_rental_rates_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rental_rates_category ON public.rental_rates USING btree (category_id);


--
-- Name: idx_rental_rates_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rental_rates_type ON public.rental_rates USING btree (rate_type);


--
-- Name: idx_rental_timesheets_checker; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rental_timesheets_checker ON public.rental_timesheets USING btree (checker_id);


--
-- Name: idx_rental_timesheets_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rental_timesheets_date ON public.rental_timesheets USING btree (work_date);


--
-- Name: idx_rental_timesheets_item; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rental_timesheets_item ON public.rental_timesheets USING btree (rental_item_id);


--
-- Name: idx_rental_timesheets_rental; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rental_timesheets_rental ON public.rental_timesheets USING btree (rental_id);


--
-- Name: idx_rental_timesheets_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rental_timesheets_status ON public.rental_timesheets USING btree (status);


--
-- Name: idx_rental_timesheets_verifier; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rental_timesheets_verifier ON public.rental_timesheets USING btree (verifier_id);


--
-- Name: idx_rentals_client; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rentals_client ON public.rentals USING btree (client_id);


--
-- Name: idx_rentals_contract; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rentals_contract ON public.rentals USING btree (contract_id);


--
-- Name: idx_rentals_dates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rentals_dates ON public.rentals USING btree (start_date, expected_end_date);


--
-- Name: idx_rentals_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rentals_number ON public.rentals USING btree (rental_number);


--
-- Name: idx_rentals_overdue; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rentals_overdue ON public.rentals USING btree (status, expected_end_date) WHERE ((status)::text = 'rented_out'::text);


--
-- Name: idx_rentals_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rentals_status ON public.rentals USING btree (status);


--
-- Name: idx_report_access_log_report; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_report_access_log_report ON public.report_access_log USING btree (report_id);


--
-- Name: idx_report_access_log_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_report_access_log_user ON public.report_access_log USING btree (user_id);


--
-- Name: idx_report_definitions_org; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_report_definitions_org ON public.report_definitions USING btree (organization_id);


--
-- Name: idx_report_definitions_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_report_definitions_type ON public.report_definitions USING btree (report_type);


--
-- Name: idx_role_permissions_permission; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_role_permissions_permission ON public.role_permissions USING btree (permission_id);


--
-- Name: idx_role_permissions_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_role_permissions_role ON public.role_permissions USING btree (role_id);


--
-- Name: idx_sales_invoices_client; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_invoices_client ON public.sales_invoices USING btree (client_id);


--
-- Name: idx_sales_invoices_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_invoices_company_id ON public.sales_invoices USING btree (company_id);


--
-- Name: idx_sales_invoices_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_invoices_date ON public.sales_invoices USING btree (date);


--
-- Name: idx_sales_orders_client; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_orders_client ON public.sales_orders USING btree (client_id);


--
-- Name: idx_sales_quotes_client; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_quotes_client ON public.sales_quotes USING btree (client_id);


--
-- Name: idx_sales_shipments_so; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_shipments_so ON public.sales_shipments USING btree (sales_order_id);


--
-- Name: idx_saved_reports_definition; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_saved_reports_definition ON public.saved_reports USING btree (definition_id);


--
-- Name: idx_saved_reports_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_saved_reports_user ON public.saved_reports USING btree (generated_by);


--
-- Name: idx_sensor_aggregates_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sensor_aggregates_period ON public.sensor_aggregates USING btree (period_start);


--
-- Name: idx_sensor_alerts_asset; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sensor_alerts_asset ON public.sensor_alerts USING btree (asset_id);


--
-- Name: idx_sensor_alerts_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sensor_alerts_status ON public.sensor_alerts USING btree (status) WHERE ((status)::text = 'active'::text);


--
-- Name: idx_sensor_readings_asset_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sensor_readings_asset_time ON public.sensor_readings USING btree (asset_id, "time" DESC);


--
-- Name: idx_sensor_readings_sensor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sensor_readings_sensor ON public.sensor_readings USING btree (sensor_id, "time" DESC);


--
-- Name: idx_sensor_thresholds_asset; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sensor_thresholds_asset ON public.sensor_thresholds USING btree (asset_id);


--
-- Name: idx_sle_company_wh_item_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sle_company_wh_item_date ON public.stock_ledger_entries USING btree (company_id, warehouse_id, item_id, posting_date);


--
-- Name: idx_sle_posting_datetime; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sle_posting_datetime ON public.stock_ledger_entries USING btree (posting_datetime);


--
-- Name: idx_sle_voucher; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sle_voucher ON public.stock_ledger_entries USING btree (voucher_type, voucher_id);


--
-- Name: idx_spec_history_asset; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_spec_history_asset ON public.asset_specification_history USING btree (asset_id);


--
-- Name: idx_spec_history_conversion; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_spec_history_conversion ON public.asset_specification_history USING btree (conversion_id);


--
-- Name: idx_stock_reservations_item; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_reservations_item ON public.stock_reservations USING btree (warehouse_id, item_id);


--
-- Name: idx_system_health_checked; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_system_health_checked ON public.system_health_checks USING btree (checked_at);


--
-- Name: idx_tenant_prov_tenant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tenant_prov_tenant ON public.tenant_provisioning_logs USING btree (tenant_id);


--
-- Name: idx_user_roles_org; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_roles_org ON public.user_roles USING btree (organization_id);


--
-- Name: idx_user_roles_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_roles_role ON public.user_roles USING btree (role_id);


--
-- Name: idx_user_roles_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_roles_user ON public.user_roles USING btree (user_id);


--
-- Name: idx_users_department_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_department_id ON public.users USING btree (department_id);


--
-- Name: idx_users_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_name ON public.users USING btree (name);


--
-- Name: idx_users_name_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_name_trgm ON public.users USING gin (name public.gin_trgm_ops);


--
-- Name: idx_users_organization; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_organization ON public.users USING btree (organization_id);


--
-- Name: idx_users_role_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role_id ON public.users USING btree (role_id);


--
-- Name: idx_vehicle_details_expiry; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vehicle_details_expiry ON public.vehicle_details USING btree (tax_expiry);


--
-- Name: idx_vehicle_details_plate; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vehicle_details_plate ON public.vehicle_details USING btree (license_plate);


--
-- Name: idx_warehouses_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_warehouses_company ON public.warehouses USING btree (company_id);


--
-- Name: idx_warehouses_parent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_warehouses_parent ON public.warehouses USING btree (parent_id);


--
-- Name: idx_wo_parts_wo_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wo_parts_wo_id ON public.maintenance_work_order_parts USING btree (work_order_id);


--
-- Name: idx_work_exp_employee; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_work_exp_employee ON public.work_experiences USING btree (employee_id);


--
-- Name: idx_work_orders_asset; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_work_orders_asset ON public.maintenance_work_orders USING btree (asset_id);


--
-- Name: idx_work_orders_asset_status_composite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_work_orders_asset_status_composite ON public.maintenance_work_orders USING btree (asset_id, status);


--
-- Name: idx_work_orders_dates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_work_orders_dates ON public.maintenance_work_orders USING btree (scheduled_date, due_date);


--
-- Name: idx_work_orders_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_work_orders_priority ON public.maintenance_work_orders USING btree (priority);


--
-- Name: idx_work_orders_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_work_orders_status ON public.maintenance_work_orders USING btree (status);


--
-- Name: idx_work_orders_technician; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_work_orders_technician ON public.maintenance_work_orders USING btree (assigned_technician);


--
-- Name: asset_loans audit_asset_loans; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER audit_asset_loans AFTER INSERT OR DELETE OR UPDATE ON public.asset_loans FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();


--
-- Name: assets audit_assets; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER audit_assets AFTER INSERT OR DELETE OR UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();


--
-- Name: maintenance_work_orders audit_maintenance_work_orders; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER audit_maintenance_work_orders AFTER INSERT OR DELETE OR UPDATE ON public.maintenance_work_orders FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();


--
-- Name: approval_histories trg_prevent_approval_history_mutation; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_approval_history_mutation BEFORE DELETE OR UPDATE ON public.approval_histories FOR EACH ROW EXECUTE FUNCTION public.prevent_approval_history_mutation();


--
-- Name: asset_custody_history trg_prevent_custody_history_mutation; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_custody_history_mutation BEFORE DELETE OR UPDATE ON public.asset_custody_history FOR EACH ROW EXECUTE FUNCTION public.prevent_custody_history_mutation();


--
-- Name: gl_entries trg_prevent_gl_mutation; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_gl_mutation BEFORE DELETE OR UPDATE ON public.gl_entries FOR EACH ROW EXECUTE FUNCTION public.prevent_gl_entries_mutation();


--
-- Name: stock_ledger_entries trg_prevent_stock_ledger_mutation; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_stock_ledger_mutation BEFORE DELETE OR UPDATE ON public.stock_ledger_entries FOR EACH ROW EXECUTE FUNCTION public.prevent_stock_ledger_mutation();


--
-- Name: asset_conversions trigger_asset_conversions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_asset_conversions_updated_at BEFORE UPDATE ON public.asset_conversions FOR EACH ROW EXECUTE FUNCTION public.update_asset_conversions_updated_at();


--
-- Name: employees trigger_employees_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_employees_updated_at();


--
-- Name: rental_contracts trigger_update_contracts_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_contracts_timestamp BEFORE UPDATE ON public.rental_contracts FOR EACH ROW EXECUTE FUNCTION public.update_contracts_updated_at();


--
-- Name: approval_requests update_approval_requests_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_approval_requests_updated_at BEFORE UPDATE ON public.approval_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: approval_workflows update_approval_workflows_modtime; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_approval_workflows_modtime BEFORE UPDATE ON public.approval_workflows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: asset_conversions update_asset_conversions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_asset_conversions_updated_at BEFORE UPDATE ON public.asset_conversions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: asset_documents update_asset_documents_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_asset_documents_updated_at BEFORE UPDATE ON public.asset_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: asset_expenses update_asset_expenses_modtime; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_asset_expenses_modtime BEFORE UPDATE ON public.asset_expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: asset_loans update_asset_loans_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_asset_loans_updated_at BEFORE UPDATE ON public.asset_loans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: assets update_assets_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: building_details update_building_details_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_building_details_updated_at BEFORE UPDATE ON public.building_details FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: categories update_categories_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: category_attribute_templates update_category_attribute_templates_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_category_attribute_templates_updated_at BEFORE UPDATE ON public.category_attribute_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: chart_of_accounts update_chart_of_accounts_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_chart_of_accounts_updated_at BEFORE UPDATE ON public.chart_of_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: client_contacts update_client_contacts_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_client_contacts_updated_at BEFORE UPDATE ON public.client_contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: contract_renewals update_contract_renewals_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_contract_renewals_updated_at BEFORE UPDATE ON public.contract_renewals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: contract_templates update_contract_templates_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_contract_templates_updated_at BEFORE UPDATE ON public.contract_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: departments update_departments_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: employee_evaluations update_employee_evaluations_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_employee_evaluations_updated_at BEFORE UPDATE ON public.employee_evaluations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: fuel_logs update_fuel_logs_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_fuel_logs_updated_at BEFORE UPDATE ON public.fuel_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: furniture_details update_furniture_details_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_furniture_details_updated_at BEFORE UPDATE ON public.furniture_details FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: heavy_equipment_details update_heavy_equip_details_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_heavy_equip_details_updated_at BEFORE UPDATE ON public.heavy_equipment_details FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: insurances update_insurances_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_insurances_updated_at BEFORE UPDATE ON public.insurances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: inventory_categories update_inventory_categories_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_inventory_categories_updated_at BEFORE UPDATE ON public.inventory_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: inventory_details update_inventory_details_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_inventory_details_updated_at BEFORE UPDATE ON public.inventory_details FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: inventory_documents update_inventory_documents_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_inventory_documents_updated_at BEFORE UPDATE ON public.inventory_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: inventory_items update_inventory_items_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: journal_entries update_journal_entries_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_journal_entries_updated_at BEFORE UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: land_details update_land_details_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_land_details_updated_at BEFORE UPDATE ON public.land_details FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: leave_requests update_leave_requests_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: locations update_locations_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: machine_details update_machine_details_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_machine_details_updated_at BEFORE UPDATE ON public.machine_details FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: maintenance_schedules update_maintenance_schedules_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_maintenance_schedules_updated_at BEFORE UPDATE ON public.maintenance_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: maintenance_records update_maintenance_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_maintenance_updated_at BEFORE UPDATE ON public.maintenance_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: maintenance_work_orders update_maintenance_work_orders_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_maintenance_work_orders_updated_at BEFORE UPDATE ON public.maintenance_work_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: notification_preferences update_notification_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: notification_templates update_notification_templates_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON public.notification_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: organizations update_organizations_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: preventive_schedules update_preventive_schedule_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_preventive_schedule_updated_at BEFORE UPDATE ON public.preventive_schedules FOR EACH ROW EXECUTE FUNCTION public.update_preventive_schedule_updated_at();


--
-- Name: rental_billing_periods update_rental_billing_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_rental_billing_updated_at BEFORE UPDATE ON public.rental_billing_periods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: rental_timesheets update_rental_timesheets_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_rental_timesheets_updated_at BEFORE UPDATE ON public.rental_timesheets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: report_definitions update_report_definitions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_report_definitions_updated_at BEFORE UPDATE ON public.report_definitions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: roles update_roles_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sensor_thresholds update_sensor_thresholds_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_sensor_thresholds_updated_at BEFORE UPDATE ON public.sensor_thresholds FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: vehicle_details update_vehicle_details_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_vehicle_details_updated_at BEFORE UPDATE ON public.vehicle_details FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: vendors update_vendors_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: accounting_periods accounting_periods_fiscal_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounting_periods
    ADD CONSTRAINT accounting_periods_fiscal_year_id_fkey FOREIGN KEY (fiscal_year_id) REFERENCES public.fiscal_years(id) ON DELETE CASCADE;


--
-- Name: app_migration_history app_migration_history_app_name_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_migration_history
    ADD CONSTRAINT app_migration_history_app_name_fkey FOREIGN KEY (app_name) REFERENCES public.installed_apps(app_name) ON DELETE CASCADE;


--
-- Name: approval_histories approval_histories_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_histories
    ADD CONSTRAINT approval_histories_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id);


--
-- Name: approval_histories approval_histories_approval_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_histories
    ADD CONSTRAINT approval_histories_approval_request_id_fkey FOREIGN KEY (approval_request_id) REFERENCES public.approval_requests(id) ON DELETE CASCADE;


--
-- Name: approval_requests approval_requests_approved_by_l1_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_requests
    ADD CONSTRAINT approval_requests_approved_by_l1_fkey FOREIGN KEY (approved_by_l1) REFERENCES public.users(id);


--
-- Name: approval_requests approval_requests_approved_by_l2_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_requests
    ADD CONSTRAINT approval_requests_approved_by_l2_fkey FOREIGN KEY (approved_by_l2) REFERENCES public.users(id);


--
-- Name: approval_requests approval_requests_approved_by_l3_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_requests
    ADD CONSTRAINT approval_requests_approved_by_l3_fkey FOREIGN KEY (approved_by_l3) REFERENCES public.users(id);


--
-- Name: approval_requests approval_requests_approved_by_l4_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_requests
    ADD CONSTRAINT approval_requests_approved_by_l4_fkey FOREIGN KEY (approved_by_l4) REFERENCES public.users(id);


--
-- Name: approval_requests approval_requests_approved_by_l5_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_requests
    ADD CONSTRAINT approval_requests_approved_by_l5_fkey FOREIGN KEY (approved_by_l5) REFERENCES public.users(id);


--
-- Name: approval_requests approval_requests_delegated_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_requests
    ADD CONSTRAINT approval_requests_delegated_to_fkey FOREIGN KEY (delegated_to) REFERENCES public.users(id);


--
-- Name: approval_requests approval_requests_final_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_requests
    ADD CONSTRAINT approval_requests_final_approved_by_fkey FOREIGN KEY (final_approved_by) REFERENCES public.users(id);


--
-- Name: approval_requests approval_requests_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_requests
    ADD CONSTRAINT approval_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id);


--
-- Name: asset_conversions asset_conversions_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_conversions
    ADD CONSTRAINT asset_conversions_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: asset_conversions asset_conversions_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_conversions
    ADD CONSTRAINT asset_conversions_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- Name: asset_conversions asset_conversions_executed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_conversions
    ADD CONSTRAINT asset_conversions_executed_by_fkey FOREIGN KEY (executed_by) REFERENCES public.users(id);


--
-- Name: asset_conversions asset_conversions_from_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_conversions
    ADD CONSTRAINT asset_conversions_from_category_id_fkey FOREIGN KEY (from_category_id) REFERENCES public.categories(id);


--
-- Name: asset_conversions asset_conversions_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_conversions
    ADD CONSTRAINT asset_conversions_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id);


--
-- Name: asset_conversions asset_conversions_to_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_conversions
    ADD CONSTRAINT asset_conversions_to_category_id_fkey FOREIGN KEY (to_category_id) REFERENCES public.categories(id);


--
-- Name: asset_custody_history asset_custody_history_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_custody_history
    ADD CONSTRAINT asset_custody_history_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- Name: asset_custody_history asset_custody_history_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_custody_history
    ADD CONSTRAINT asset_custody_history_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id);


--
-- Name: asset_custody_history asset_custody_history_custodian_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_custody_history
    ADD CONSTRAINT asset_custody_history_custodian_user_id_fkey FOREIGN KEY (custodian_user_id) REFERENCES public.users(id);


--
-- Name: asset_custody_history asset_custody_history_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_custody_history
    ADD CONSTRAINT asset_custody_history_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: asset_custody_history asset_custody_history_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_custody_history
    ADD CONSTRAINT asset_custody_history_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id);


--
-- Name: asset_depreciation_logs asset_depreciation_logs_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_depreciation_logs
    ADD CONSTRAINT asset_depreciation_logs_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- Name: asset_depreciation_logs asset_depreciation_logs_journal_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_depreciation_logs
    ADD CONSTRAINT asset_depreciation_logs_journal_entry_id_fkey FOREIGN KEY (journal_entry_id) REFERENCES public.journal_entries(id);


--
-- Name: asset_documents asset_documents_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_documents
    ADD CONSTRAINT asset_documents_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- Name: asset_documents asset_documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_documents
    ADD CONSTRAINT asset_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: asset_expense_items asset_expense_items_expense_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_expense_items
    ADD CONSTRAINT asset_expense_items_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES public.asset_expenses(id) ON DELETE CASCADE;


--
-- Name: asset_expenses asset_expenses_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_expenses
    ADD CONSTRAINT asset_expenses_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- Name: asset_expenses asset_expenses_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_expenses
    ADD CONSTRAINT asset_expenses_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id);


--
-- Name: asset_history asset_history_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_history
    ADD CONSTRAINT asset_history_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id);


--
-- Name: asset_history asset_history_from_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_history
    ADD CONSTRAINT asset_history_from_location_id_fkey FOREIGN KEY (from_location_id) REFERENCES public.locations(id);


--
-- Name: asset_history asset_history_from_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_history
    ADD CONSTRAINT asset_history_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES public.users(id);


--
-- Name: asset_history asset_history_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_history
    ADD CONSTRAINT asset_history_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id);


--
-- Name: asset_history asset_history_to_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_history
    ADD CONSTRAINT asset_history_to_location_id_fkey FOREIGN KEY (to_location_id) REFERENCES public.locations(id);


--
-- Name: asset_history asset_history_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_history
    ADD CONSTRAINT asset_history_to_user_id_fkey FOREIGN KEY (to_user_id) REFERENCES public.users(id);


--
-- Name: asset_lifecycle_history asset_lifecycle_history_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_lifecycle_history
    ADD CONSTRAINT asset_lifecycle_history_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- Name: asset_lifecycle_history asset_lifecycle_history_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_lifecycle_history
    ADD CONSTRAINT asset_lifecycle_history_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id);


--
-- Name: asset_loans asset_loans_approver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_loans
    ADD CONSTRAINT asset_loans_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES public.users(id);


--
-- Name: asset_loans asset_loans_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_loans
    ADD CONSTRAINT asset_loans_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- Name: asset_loans asset_loans_borrower_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_loans
    ADD CONSTRAINT asset_loans_borrower_id_fkey FOREIGN KEY (borrower_id) REFERENCES public.users(id);


--
-- Name: asset_loans asset_loans_checked_in_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_loans
    ADD CONSTRAINT asset_loans_checked_in_by_fkey FOREIGN KEY (checked_in_by) REFERENCES public.users(id);


--
-- Name: asset_loans asset_loans_checked_out_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_loans
    ADD CONSTRAINT asset_loans_checked_out_by_fkey FOREIGN KEY (checked_out_by) REFERENCES public.users(id);


--
-- Name: asset_loans asset_loans_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_loans
    ADD CONSTRAINT asset_loans_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: asset_specification_history asset_specification_history_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_specification_history
    ADD CONSTRAINT asset_specification_history_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- Name: asset_specification_history asset_specification_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_specification_history
    ADD CONSTRAINT asset_specification_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id);


--
-- Name: asset_specification_history asset_specification_history_conversion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_specification_history
    ADD CONSTRAINT asset_specification_history_conversion_id_fkey FOREIGN KEY (conversion_id) REFERENCES public.asset_conversions(id);


--
-- Name: asset_specification_history asset_specification_history_new_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_specification_history
    ADD CONSTRAINT asset_specification_history_new_category_id_fkey FOREIGN KEY (new_category_id) REFERENCES public.categories(id);


--
-- Name: asset_specification_history asset_specification_history_old_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_specification_history
    ADD CONSTRAINT asset_specification_history_old_category_id_fkey FOREIGN KEY (old_category_id) REFERENCES public.categories(id);


--
-- Name: asset_tax_renewals asset_tax_renewals_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_tax_renewals
    ADD CONSTRAINT asset_tax_renewals_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- Name: asset_valuations asset_valuations_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_valuations
    ADD CONSTRAINT asset_valuations_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- Name: asset_valuations asset_valuations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_valuations
    ADD CONSTRAINT asset_valuations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: assets assets_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: assets assets_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: assets assets_condition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_condition_id_fkey FOREIGN KEY (condition_id) REFERENCES public.asset_conditions(id);


--
-- Name: assets assets_currency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_currency_id_fkey FOREIGN KEY (currency_id) REFERENCES public.currencies(id);


--
-- Name: assets assets_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: assets assets_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id);


--
-- Name: assets assets_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: assets assets_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: assets assets_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: attendance_records attendance_records_check_in_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_check_in_location_id_fkey FOREIGN KEY (check_in_location_id) REFERENCES public.locations(id);


--
-- Name: attendance_records attendance_records_check_out_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_check_out_location_id_fkey FOREIGN KEY (check_out_location_id) REFERENCES public.locations(id);


--
-- Name: attendance_records attendance_records_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: audit_records audit_records_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_records
    ADD CONSTRAINT audit_records_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id);


--
-- Name: audit_records audit_records_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_records
    ADD CONSTRAINT audit_records_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.audit_sessions(id);


--
-- Name: audit_sessions audit_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_sessions
    ADD CONSTRAINT audit_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: bins bins_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bins
    ADD CONSTRAINT bins_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE;


--
-- Name: bins bins_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bins
    ADD CONSTRAINT bins_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: bom_items bom_items_bom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bom_items
    ADD CONSTRAINT bom_items_bom_id_fkey FOREIGN KEY (bom_id) REFERENCES public.boms(id) ON DELETE CASCADE;


--
-- Name: bom_items bom_items_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bom_items
    ADD CONSTRAINT bom_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id);


--
-- Name: boms boms_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.boms
    ADD CONSTRAINT boms_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id);


--
-- Name: building_details building_details_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.building_details
    ADD CONSTRAINT building_details_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- Name: building_details building_details_land_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.building_details
    ADD CONSTRAINT building_details_land_asset_id_fkey FOREIGN KEY (land_asset_id) REFERENCES public.assets(id) ON DELETE SET NULL;


--
-- Name: cash_bank_transactions cash_bank_transactions_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_bank_transactions
    ADD CONSTRAINT cash_bank_transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: cash_bank_transactions cash_bank_transactions_from_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_bank_transactions
    ADD CONSTRAINT cash_bank_transactions_from_account_id_fkey FOREIGN KEY (from_account_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: cash_bank_transactions cash_bank_transactions_journal_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_bank_transactions
    ADD CONSTRAINT cash_bank_transactions_journal_entry_id_fkey FOREIGN KEY (journal_entry_id) REFERENCES public.journal_entries(id);


--
-- Name: cash_bank_transactions cash_bank_transactions_to_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_bank_transactions
    ADD CONSTRAINT cash_bank_transactions_to_account_id_fkey FOREIGN KEY (to_account_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: categories categories_accumulated_depreciation_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_accumulated_depreciation_account_id_fkey FOREIGN KEY (accumulated_depreciation_account_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: categories categories_asset_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_asset_account_id_fkey FOREIGN KEY (asset_account_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: categories categories_capital_wip_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_capital_wip_account_id_fkey FOREIGN KEY (capital_wip_account_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: categories categories_expense_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_expense_account_id_fkey FOREIGN KEY (expense_account_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: categories categories_gain_loss_disposal_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_gain_loss_disposal_account_id_fkey FOREIGN KEY (gain_loss_disposal_account_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id);


--
-- Name: category_attribute_templates category_attribute_templates_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.category_attribute_templates
    ADD CONSTRAINT category_attribute_templates_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: chart_of_accounts chart_of_accounts_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT chart_of_accounts_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: client_contacts client_contacts_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_contacts
    ADD CONSTRAINT client_contacts_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: commercial_contracts commercial_contracts_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commercial_contracts
    ADD CONSTRAINT commercial_contracts_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: contract_approvals contract_approvals_approver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_approvals
    ADD CONSTRAINT contract_approvals_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES public.users(id);


--
-- Name: contract_approvals contract_approvals_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_approvals
    ADD CONSTRAINT contract_approvals_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.rental_contracts(id) ON DELETE CASCADE;


--
-- Name: contract_approvals contract_approvals_delegated_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_approvals
    ADD CONSTRAINT contract_approvals_delegated_to_fkey FOREIGN KEY (delegated_to) REFERENCES public.users(id);


--
-- Name: contract_documents contract_documents_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_documents
    ADD CONSTRAINT contract_documents_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.rental_contracts(id) ON DELETE CASCADE;


--
-- Name: contract_documents contract_documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_documents
    ADD CONSTRAINT contract_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: contract_renewals contract_renewals_new_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_renewals
    ADD CONSTRAINT contract_renewals_new_contract_id_fkey FOREIGN KEY (new_contract_id) REFERENCES public.rental_contracts(id) ON DELETE SET NULL;


--
-- Name: contract_renewals contract_renewals_original_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_renewals
    ADD CONSTRAINT contract_renewals_original_contract_id_fkey FOREIGN KEY (original_contract_id) REFERENCES public.rental_contracts(id) ON DELETE CASCADE;


--
-- Name: contract_renewals contract_renewals_renewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_renewals
    ADD CONSTRAINT contract_renewals_renewed_by_fkey FOREIGN KEY (renewed_by) REFERENCES public.users(id);


--
-- Name: cost_centers cost_centers_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cost_centers
    ADD CONSTRAINT cost_centers_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.cost_centers(id);


--
-- Name: custom_docperms custom_docperms_doctype_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_docperms
    ADD CONSTRAINT custom_docperms_doctype_id_fkey FOREIGN KEY (doctype_id) REFERENCES public.doctypes(id) ON DELETE CASCADE;


--
-- Name: custom_docperms custom_docperms_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_docperms
    ADD CONSTRAINT custom_docperms_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: data_import_logs data_import_logs_data_import_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_import_logs
    ADD CONSTRAINT data_import_logs_data_import_id_fkey FOREIGN KEY (data_import_id) REFERENCES public.data_imports(id) ON DELETE CASCADE;


--
-- Name: data_imports data_imports_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_imports
    ADD CONSTRAINT data_imports_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: departments departments_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: departments departments_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.departments(id);


--
-- Name: depreciation_schedules depreciation_schedules_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.depreciation_schedules
    ADD CONSTRAINT depreciation_schedules_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- Name: employee_evaluations employee_evaluations_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_evaluations
    ADD CONSTRAINT employee_evaluations_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: employee_evaluations employee_evaluations_evaluator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_evaluations
    ADD CONSTRAINT employee_evaluations_evaluator_id_fkey FOREIGN KEY (evaluator_id) REFERENCES public.users(id);


--
-- Name: employees employees_assigned_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_assigned_asset_id_fkey FOREIGN KEY (assigned_asset_id) REFERENCES public.assets(id);


--
-- Name: employees employees_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: employees employees_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.employees(id);


--
-- Name: employees employees_office_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_office_location_id_fkey FOREIGN KEY (office_location_id) REFERENCES public.locations(id);


--
-- Name: employees employees_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: employees employees_work_area_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_work_area_id_fkey FOREIGN KEY (work_area_id) REFERENCES public.locations(id);


--
-- Name: expense_items expense_items_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_items
    ADD CONSTRAINT expense_items_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: expense_items expense_items_expense_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_items
    ADD CONSTRAINT expense_items_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES public.expenses(id) ON DELETE CASCADE;


--
-- Name: expenses expenses_journal_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_journal_entry_id_fkey FOREIGN KEY (journal_entry_id) REFERENCES public.journal_entries(id);


--
-- Name: expenses expenses_pay_from_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pay_from_account_id_fkey FOREIGN KEY (pay_from_account_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: face_photos face_photos_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.face_photos
    ADD CONSTRAINT face_photos_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: field_definitions field_definitions_entity_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.field_definitions
    ADD CONSTRAINT field_definitions_entity_type_id_fkey FOREIGN KEY (entity_type_id) REFERENCES public.entity_types(id) ON DELETE CASCADE;


--
-- Name: approval_workflows fk_approval_workflows_entity_type; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_workflows
    ADD CONSTRAINT fk_approval_workflows_entity_type FOREIGN KEY (entity_type) REFERENCES public.approval_entity_types(value) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: fuel_logs fuel_logs_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fuel_logs
    ADD CONSTRAINT fuel_logs_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: fuel_logs fuel_logs_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fuel_logs
    ADD CONSTRAINT fuel_logs_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- Name: fuel_logs fuel_logs_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fuel_logs
    ADD CONSTRAINT fuel_logs_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.users(id);


--
-- Name: fuel_logs fuel_logs_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fuel_logs
    ADD CONSTRAINT fuel_logs_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id);


--
-- Name: furniture_details furniture_details_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.furniture_details
    ADD CONSTRAINT furniture_details_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- Name: gl_entries gl_entries_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gl_entries
    ADD CONSTRAINT gl_entries_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: gl_entries gl_entries_reversal_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gl_entries
    ADD CONSTRAINT gl_entries_reversal_source_id_fkey FOREIGN KEY (reversal_source_id) REFERENCES public.gl_entries(id);


--
-- Name: heavy_equipment_details heavy_equipment_details_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.heavy_equipment_details
    ADD CONSTRAINT heavy_equipment_details_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- Name: id_tax_invoices id_tax_invoices_sales_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.id_tax_invoices
    ADD CONSTRAINT id_tax_invoices_sales_invoice_id_fkey FOREIGN KEY (sales_invoice_id) REFERENCES public.sales_invoices(id);


--
-- Name: id_withholding_certificates id_withholding_certificates_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.id_withholding_certificates
    ADD CONSTRAINT id_withholding_certificates_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: id_withholding_certificates id_withholding_certificates_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.id_withholding_certificates
    ADD CONSTRAINT id_withholding_certificates_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: insurances insurances_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insurances
    ADD CONSTRAINT insurances_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- Name: inventory_categories inventory_categories_expense_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_categories
    ADD CONSTRAINT inventory_categories_expense_account_id_fkey FOREIGN KEY (expense_account_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: inventory_categories inventory_categories_inventory_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_categories
    ADD CONSTRAINT inventory_categories_inventory_account_id_fkey FOREIGN KEY (inventory_account_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: inventory_details inventory_details_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_details
    ADD CONSTRAINT inventory_details_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- Name: inventory_documents inventory_documents_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_documents
    ADD CONSTRAINT inventory_documents_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE;


--
-- Name: inventory_documents inventory_documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_documents
    ADD CONSTRAINT inventory_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: inventory_items inventory_items_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.inventory_categories(id);


--
-- Name: inventory_items inventory_items_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: inventory_movements inventory_movements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: inventory_movements inventory_movements_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE;


--
-- Name: journal_lines journal_lines_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journal_lines
    ADD CONSTRAINT journal_lines_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: journal_lines journal_lines_journal_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journal_lines
    ADD CONSTRAINT journal_lines_journal_entry_id_fkey FOREIGN KEY (journal_entry_id) REFERENCES public.journal_entries(id) ON DELETE CASCADE;


--
-- Name: land_details land_details_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.land_details
    ADD CONSTRAINT land_details_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- Name: layout_definitions layout_definitions_entity_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.layout_definitions
    ADD CONSTRAINT layout_definitions_entity_type_id_fkey FOREIGN KEY (entity_type_id) REFERENCES public.entity_types(id) ON DELETE CASCADE;


--
-- Name: leave_requests leave_requests_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: leave_requests leave_requests_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: locations locations_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.locations(id);


--
-- Name: machine_details machine_details_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.machine_details
    ADD CONSTRAINT machine_details_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- Name: maintenance_checklists maintenance_checklists_completed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_checklists
    ADD CONSTRAINT maintenance_checklists_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES public.users(id);


--
-- Name: maintenance_checklists maintenance_checklists_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_checklists
    ADD CONSTRAINT maintenance_checklists_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.users(id);


--
-- Name: maintenance_checklists maintenance_checklists_work_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_checklists
    ADD CONSTRAINT maintenance_checklists_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES public.maintenance_work_orders(id) ON DELETE CASCADE;


--
-- Name: maintenance_records maintenance_records_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_records
    ADD CONSTRAINT maintenance_records_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id);


--
-- Name: maintenance_records maintenance_records_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_records
    ADD CONSTRAINT maintenance_records_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: maintenance_records maintenance_records_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_records
    ADD CONSTRAINT maintenance_records_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: maintenance_records maintenance_records_currency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_records
    ADD CONSTRAINT maintenance_records_currency_id_fkey FOREIGN KEY (currency_id) REFERENCES public.currencies(id);


--
-- Name: maintenance_records maintenance_records_maintenance_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_records
    ADD CONSTRAINT maintenance_records_maintenance_type_id_fkey FOREIGN KEY (maintenance_type_id) REFERENCES public.maintenance_types(id);


--
-- Name: maintenance_records maintenance_records_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_records
    ADD CONSTRAINT maintenance_records_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: maintenance_schedules maintenance_schedules_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_schedules
    ADD CONSTRAINT maintenance_schedules_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- Name: maintenance_template_tasks maintenance_template_tasks_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_template_tasks
    ADD CONSTRAINT maintenance_template_tasks_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.maintenance_templates(id) ON DELETE CASCADE;


--
-- Name: maintenance_templates maintenance_templates_asset_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_templates
    ADD CONSTRAINT maintenance_templates_asset_category_id_fkey FOREIGN KEY (asset_category_id) REFERENCES public.categories(id);


--
-- Name: maintenance_templates maintenance_templates_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_templates
    ADD CONSTRAINT maintenance_templates_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.maintenance_templates(id);


--
-- Name: maintenance_work_order_parts maintenance_work_order_parts_inventory_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_work_order_parts
    ADD CONSTRAINT maintenance_work_order_parts_inventory_item_id_fkey FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id);


--
-- Name: maintenance_work_order_parts maintenance_work_order_parts_work_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_work_order_parts
    ADD CONSTRAINT maintenance_work_order_parts_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES public.maintenance_work_orders(id) ON DELETE CASCADE;


--
-- Name: maintenance_work_orders maintenance_work_orders_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_work_orders
    ADD CONSTRAINT maintenance_work_orders_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: maintenance_work_orders maintenance_work_orders_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_work_orders
    ADD CONSTRAINT maintenance_work_orders_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- Name: maintenance_work_orders maintenance_work_orders_assigned_technician_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_work_orders
    ADD CONSTRAINT maintenance_work_orders_assigned_technician_fkey FOREIGN KEY (assigned_technician) REFERENCES public.users(id);


--
-- Name: maintenance_work_orders maintenance_work_orders_capex_expense_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_work_orders
    ADD CONSTRAINT maintenance_work_orders_capex_expense_id_fkey FOREIGN KEY (capex_expense_id) REFERENCES public.asset_expenses(id);


--
-- Name: maintenance_work_orders maintenance_work_orders_completed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_work_orders
    ADD CONSTRAINT maintenance_work_orders_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES public.users(id);


--
-- Name: maintenance_work_orders maintenance_work_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_work_orders
    ADD CONSTRAINT maintenance_work_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: maintenance_work_orders maintenance_work_orders_expense_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_work_orders
    ADD CONSTRAINT maintenance_work_orders_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES public.asset_expenses(id);


--
-- Name: maintenance_work_orders maintenance_work_orders_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_work_orders
    ADD CONSTRAINT maintenance_work_orders_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id);


--
-- Name: maintenance_work_orders maintenance_work_orders_opex_expense_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_work_orders
    ADD CONSTRAINT maintenance_work_orders_opex_expense_id_fkey FOREIGN KEY (opex_expense_id) REFERENCES public.asset_expenses(id);


--
-- Name: maintenance_work_orders maintenance_work_orders_target_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_work_orders
    ADD CONSTRAINT maintenance_work_orders_target_category_id_fkey FOREIGN KEY (target_category_id) REFERENCES public.categories(id);


--
-- Name: maintenance_work_orders maintenance_work_orders_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_work_orders
    ADD CONSTRAINT maintenance_work_orders_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: notification_preferences notification_preferences_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.notification_templates(id);


--
-- Name: notification_preferences notification_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.notification_templates(id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: opening_balance_items opening_balance_items_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opening_balance_items
    ADD CONSTRAINT opening_balance_items_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: opening_balance_items opening_balance_items_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opening_balance_items
    ADD CONSTRAINT opening_balance_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id);


--
-- Name: opening_balance_items opening_balance_items_voucher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opening_balance_items
    ADD CONSTRAINT opening_balance_items_voucher_id_fkey FOREIGN KEY (voucher_id) REFERENCES public.opening_balance_vouchers(id) ON DELETE CASCADE;


--
-- Name: opening_balance_items opening_balance_items_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opening_balance_items
    ADD CONSTRAINT opening_balance_items_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: opening_balance_vouchers opening_balance_vouchers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opening_balance_vouchers
    ADD CONSTRAINT opening_balance_vouchers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: opportunities opportunities_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id);


--
-- Name: organizations organizations_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.users(id);


--
-- Name: organizations organizations_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.organizations(id);


--
-- Name: payroll_slips payroll_slips_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payroll_slips
    ADD CONSTRAINT payroll_slips_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: pos_profiles pos_profiles_cash_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pos_profiles
    ADD CONSTRAINT pos_profiles_cash_account_id_fkey FOREIGN KEY (cash_account_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: pos_profiles pos_profiles_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pos_profiles
    ADD CONSTRAINT pos_profiles_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: pos_shifts pos_shifts_cashier_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pos_shifts
    ADD CONSTRAINT pos_shifts_cashier_user_id_fkey FOREIGN KEY (cashier_user_id) REFERENCES public.users(id);


--
-- Name: pos_shifts pos_shifts_pos_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pos_shifts
    ADD CONSTRAINT pos_shifts_pos_profile_id_fkey FOREIGN KEY (pos_profile_id) REFERENCES public.pos_profiles(id);


--
-- Name: preventive_schedules preventive_schedules_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.preventive_schedules
    ADD CONSTRAINT preventive_schedules_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- Name: preventive_schedules preventive_schedules_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.preventive_schedules
    ADD CONSTRAINT preventive_schedules_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: preventive_schedules preventive_schedules_maintenance_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.preventive_schedules
    ADD CONSTRAINT preventive_schedules_maintenance_type_id_fkey FOREIGN KEY (maintenance_type_id) REFERENCES public.maintenance_types(id);


--
-- Name: print_templates print_templates_entity_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.print_templates
    ADD CONSTRAINT print_templates_entity_type_id_fkey FOREIGN KEY (entity_type_id) REFERENCES public.entity_types(id);


--
-- Name: production_orders production_orders_bom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT production_orders_bom_id_fkey FOREIGN KEY (bom_id) REFERENCES public.boms(id);


--
-- Name: production_orders production_orders_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT production_orders_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id);


--
-- Name: production_orders production_orders_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT production_orders_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: production_orders production_orders_wip_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT production_orders_wip_account_id_fkey FOREIGN KEY (wip_account_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: project_tasks project_tasks_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_tasks
    ADD CONSTRAINT project_tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: projects projects_cost_center_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_cost_center_id_fkey FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers(id);


--
-- Name: purchase_bill_items purchase_bill_items_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_bill_items
    ADD CONSTRAINT purchase_bill_items_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: purchase_bill_items purchase_bill_items_bill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_bill_items
    ADD CONSTRAINT purchase_bill_items_bill_id_fkey FOREIGN KEY (bill_id) REFERENCES public.purchase_bills(id) ON DELETE CASCADE;


--
-- Name: purchase_bills purchase_bills_journal_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_bills
    ADD CONSTRAINT purchase_bills_journal_entry_id_fkey FOREIGN KEY (journal_entry_id) REFERENCES public.journal_entries(id);


--
-- Name: purchase_bills purchase_bills_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_bills
    ADD CONSTRAINT purchase_bills_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: purchase_order_items purchase_order_items_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;


--
-- Name: purchase_orders purchase_orders_purchase_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_purchase_quote_id_fkey FOREIGN KEY (purchase_quote_id) REFERENCES public.purchase_quotes(id);


--
-- Name: purchase_orders purchase_orders_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.clients(id);


--
-- Name: purchase_quote_items purchase_quote_items_purchase_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_quote_items
    ADD CONSTRAINT purchase_quote_items_purchase_quote_id_fkey FOREIGN KEY (purchase_quote_id) REFERENCES public.purchase_quotes(id) ON DELETE CASCADE;


--
-- Name: purchase_quotes purchase_quotes_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_quotes
    ADD CONSTRAINT purchase_quotes_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.clients(id);


--
-- Name: purchase_receipt_items purchase_receipt_items_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_receipt_items
    ADD CONSTRAINT purchase_receipt_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id);


--
-- Name: purchase_receipt_items purchase_receipt_items_receipt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_receipt_items
    ADD CONSTRAINT purchase_receipt_items_receipt_id_fkey FOREIGN KEY (receipt_id) REFERENCES public.purchase_receipts(id) ON DELETE CASCADE;


--
-- Name: purchase_receipts purchase_receipts_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_receipts
    ADD CONSTRAINT purchase_receipts_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id);


--
-- Name: purchase_receipts purchase_receipts_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_receipts
    ADD CONSTRAINT purchase_receipts_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: purchase_receipts purchase_receipts_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_receipts
    ADD CONSTRAINT purchase_receipts_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: purchase_shipment_items purchase_shipment_items_purchase_shipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_shipment_items
    ADD CONSTRAINT purchase_shipment_items_purchase_shipment_id_fkey FOREIGN KEY (purchase_shipment_id) REFERENCES public.purchase_shipments(id) ON DELETE CASCADE;


--
-- Name: purchase_shipments purchase_shipments_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_shipments
    ADD CONSTRAINT purchase_shipments_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id);


--
-- Name: purchase_shipments purchase_shipments_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_shipments
    ADD CONSTRAINT purchase_shipments_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.clients(id);


--
-- Name: quality_inspection_templates quality_inspection_templates_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quality_inspection_templates
    ADD CONSTRAINT quality_inspection_templates_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id);


--
-- Name: quality_inspections quality_inspections_inspected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quality_inspections
    ADD CONSTRAINT quality_inspections_inspected_by_fkey FOREIGN KEY (inspected_by) REFERENCES public.users(id);


--
-- Name: quality_inspections quality_inspections_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quality_inspections
    ADD CONSTRAINT quality_inspections_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id);


--
-- Name: rental_billing_periods rental_billing_periods_adjusted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rental_billing_periods
    ADD CONSTRAINT rental_billing_periods_adjusted_by_fkey FOREIGN KEY (adjusted_by) REFERENCES public.users(id);


--
-- Name: rental_billing_periods rental_billing_periods_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rental_billing_periods
    ADD CONSTRAINT rental_billing_periods_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: rental_billing_periods rental_billing_periods_calculated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rental_billing_periods
    ADD CONSTRAINT rental_billing_periods_calculated_by_fkey FOREIGN KEY (calculated_by) REFERENCES public.users(id);


--
-- Name: rental_billing_periods rental_billing_periods_rental_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rental_billing_periods
    ADD CONSTRAINT rental_billing_periods_rental_id_fkey FOREIGN KEY (rental_id) REFERENCES public.rentals(id) ON DELETE CASCADE;


--
-- Name: rental_billing_periods rental_billing_periods_rental_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rental_billing_periods
    ADD CONSTRAINT rental_billing_periods_rental_item_id_fkey FOREIGN KEY (rental_item_id) REFERENCES public.rental_items(id) ON DELETE CASCADE;


--
-- Name: rental_billings rental_billings_adjusted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rental_billings
    ADD CONSTRAINT rental_billings_adjusted_by_fkey FOREIGN KEY (adjusted_by) REFERENCES public.users(id);


--
-- Name: rental_billings rental_billings_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rental_billings
    ADD CONSTRAINT rental_billings_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: rental_billings rental_billings_calculated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rental_billings
    ADD CONSTRAINT rental_billings_calculated_by_fkey FOREIGN KEY (calculated_by) REFERENCES public.users(id);


--
-- Name: rental_billings rental_billings_rental_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rental_billings
    ADD CONSTRAINT rental_billings_rental_id_fkey FOREIGN KEY (rental_id) REFERENCES public.rentals(id) ON DELETE CASCADE;


--
-- Name: rental_billings rental_billings_rental_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rental_billings
    ADD CONSTRAINT rental_billings_rental_item_id_fkey FOREIGN KEY (rental_item_id) REFERENCES public.rental_items(id) ON DELETE CASCADE;


--
-- Name: rental_contracts rental_contracts_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rental_contracts
    ADD CONSTRAINT rental_contracts_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: rental_contracts rental_contracts_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rental_contracts
    ADD CONSTRAINT rental_contracts_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE RESTRICT;


--
-- Name: rental_contracts rental_contracts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rental_contracts
    ADD CONSTRAINT rental_contracts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: rental_contracts rental_contracts_delegated_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rental_contracts
    ADD CONSTRAINT rental_contracts_delegated_to_fkey FOREIGN KEY (delegated_to) REFERENCES public.users(id);


--
-- Name: rental_contracts rental_contracts_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rental_contracts
    ADD CONSTRAINT rental_contracts_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.contract_templates(id) ON DELETE SET NULL;


--
-- Name: rental_contracts rental_contracts_terminated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rental_contracts
    ADD CONSTRAINT rental_contracts_terminated_by_fkey FOREIGN KEY (terminated_by) REFERENCES public.users(id);


--
-- Name: rental_contracts rental_contracts_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rental_contracts
    ADD CONSTRAINT rental_contracts_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: rental_details rental_details_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rental_details
    ADD CONSTRAINT rental_details_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- Name: rental_handovers rental_handovers_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rental_handovers
    ADD CONSTRAINT rental_handovers_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: rental_handovers rental_handovers_rental_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rental_handovers
    ADD CONSTRAINT rental_handovers_rental_id_fkey FOREIGN KEY (rental_id) REFERENCES public.rentals(id) ON DELETE CASCADE;


--
-- Name: rental_handovers rental_handovers_rental_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rental_handovers
    ADD CONSTRAINT rental_handovers_rental_item_id_fkey FOREIGN KEY (rental_item_id) REFERENCES public.rental_items(id) ON DELETE CASCADE;


--
-- Name: rental_items rental_items_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rental_items
    ADD CONSTRAINT rental_items_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE RESTRICT;


--
-- Name: rental_items rental_items_dispatched_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rental_items
    ADD CONSTRAINT rental_items_dispatched_by_fkey FOREIGN KEY (dispatched_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: rental_items rental_items_rental_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rental_items
    ADD CONSTRAINT rental_items_rental_id_fkey FOREIGN KEY (rental_id) REFERENCES public.rentals(id) ON DELETE CASCADE;


--
-- Name: rental_items rental_items_rental_rate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rental_items
    ADD CONSTRAINT rental_items_rental_rate_id_fkey FOREIGN KEY (rental_rate_id) REFERENCES public.rental_rates(id) ON DELETE SET NULL;


--
-- Name: rental_items rental_items_returned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rental_items
    ADD CONSTRAINT rental_items_returned_by_fkey FOREIGN KEY (returned_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: rental_rates rental_rates_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rental_rates
    ADD CONSTRAINT rental_rates_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE SET NULL;


--
-- Name: rental_rates rental_rates_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rental_rates
    ADD CONSTRAINT rental_rates_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: rental_timesheets rental_timesheets_checker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rental_timesheets
    ADD CONSTRAINT rental_timesheets_checker_id_fkey FOREIGN KEY (checker_id) REFERENCES public.users(id);


--
-- Name: rental_timesheets rental_timesheets_client_pic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rental_timesheets
    ADD CONSTRAINT rental_timesheets_client_pic_id_fkey FOREIGN KEY (client_pic_id) REFERENCES public.client_contacts(id);


--
-- Name: rental_timesheets rental_timesheets_rental_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rental_timesheets
    ADD CONSTRAINT rental_timesheets_rental_id_fkey FOREIGN KEY (rental_id) REFERENCES public.rentals(id) ON DELETE CASCADE;


--
-- Name: rental_timesheets rental_timesheets_rental_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rental_timesheets
    ADD CONSTRAINT rental_timesheets_rental_item_id_fkey FOREIGN KEY (rental_item_id) REFERENCES public.rental_items(id) ON DELETE CASCADE;


--
-- Name: rental_timesheets rental_timesheets_verifier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rental_timesheets
    ADD CONSTRAINT rental_timesheets_verifier_id_fkey FOREIGN KEY (verifier_id) REFERENCES public.users(id);


--
-- Name: rentals rentals_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rentals
    ADD CONSTRAINT rentals_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: rentals rentals_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rentals
    ADD CONSTRAINT rentals_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE RESTRICT;


--
-- Name: rentals rentals_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rentals
    ADD CONSTRAINT rentals_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.rental_contracts(id) ON DELETE SET NULL;


--
-- Name: rentals rentals_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rentals
    ADD CONSTRAINT rentals_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: report_access_log report_access_log_definition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_access_log
    ADD CONSTRAINT report_access_log_definition_id_fkey FOREIGN KEY (definition_id) REFERENCES public.report_definitions(id);


--
-- Name: report_access_log report_access_log_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_access_log
    ADD CONSTRAINT report_access_log_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.saved_reports(id);


--
-- Name: report_access_log report_access_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_access_log
    ADD CONSTRAINT report_access_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: report_definitions report_definitions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_definitions
    ADD CONSTRAINT report_definitions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: report_definitions report_definitions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_definitions
    ADD CONSTRAINT report_definitions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: role_profile_roles role_profile_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_profile_roles
    ADD CONSTRAINT role_profile_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: role_profile_roles role_profile_roles_role_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_profile_roles
    ADD CONSTRAINT role_profile_roles_role_profile_id_fkey FOREIGN KEY (role_profile_id) REFERENCES public.role_profiles(id) ON DELETE CASCADE;


--
-- Name: sales_invoice_items sales_invoice_items_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_invoice_items
    ADD CONSTRAINT sales_invoice_items_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: sales_invoice_items sales_invoice_items_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_invoice_items
    ADD CONSTRAINT sales_invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.sales_invoices(id) ON DELETE CASCADE;


--
-- Name: sales_invoices sales_invoices_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: sales_invoices sales_invoices_journal_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_journal_entry_id_fkey FOREIGN KEY (journal_entry_id) REFERENCES public.journal_entries(id);


--
-- Name: sales_order_items sales_order_items_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_order_items
    ADD CONSTRAINT sales_order_items_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: sales_order_items sales_order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_order_items
    ADD CONSTRAINT sales_order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.sales_orders(id) ON DELETE CASCADE;


--
-- Name: sales_orders sales_orders_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: sales_orders sales_orders_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.sales_quotes(id);


--
-- Name: sales_quote_items sales_quote_items_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_quote_items
    ADD CONSTRAINT sales_quote_items_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: sales_quote_items sales_quote_items_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_quote_items
    ADD CONSTRAINT sales_quote_items_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.sales_quotes(id) ON DELETE CASCADE;


--
-- Name: sales_quotes sales_quotes_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_quotes
    ADD CONSTRAINT sales_quotes_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: sales_shipment_items sales_shipment_items_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_shipment_items
    ADD CONSTRAINT sales_shipment_items_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.sales_order_items(id);


--
-- Name: sales_shipment_items sales_shipment_items_shipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_shipment_items
    ADD CONSTRAINT sales_shipment_items_shipment_id_fkey FOREIGN KEY (shipment_id) REFERENCES public.sales_shipments(id) ON DELETE CASCADE;


--
-- Name: sales_shipments sales_shipments_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_shipments
    ADD CONSTRAINT sales_shipments_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: sales_shipments sales_shipments_sales_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_shipments
    ADD CONSTRAINT sales_shipments_sales_order_id_fkey FOREIGN KEY (sales_order_id) REFERENCES public.sales_orders(id);


--
-- Name: saved_reports saved_reports_definition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_reports
    ADD CONSTRAINT saved_reports_definition_id_fkey FOREIGN KEY (definition_id) REFERENCES public.report_definitions(id);


--
-- Name: saved_reports saved_reports_generated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_reports
    ADD CONSTRAINT saved_reports_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES public.users(id);


--
-- Name: sensor_aggregates sensor_aggregates_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sensor_aggregates
    ADD CONSTRAINT sensor_aggregates_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- Name: sensor_alerts sensor_alerts_acknowledged_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sensor_alerts
    ADD CONSTRAINT sensor_alerts_acknowledged_by_fkey FOREIGN KEY (acknowledged_by) REFERENCES public.users(id);


--
-- Name: sensor_alerts sensor_alerts_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sensor_alerts
    ADD CONSTRAINT sensor_alerts_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- Name: sensor_alerts sensor_alerts_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sensor_alerts
    ADD CONSTRAINT sensor_alerts_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id);


--
-- Name: sensor_alerts sensor_alerts_threshold_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sensor_alerts
    ADD CONSTRAINT sensor_alerts_threshold_id_fkey FOREIGN KEY (threshold_id) REFERENCES public.sensor_thresholds(id);


--
-- Name: sensor_readings sensor_readings_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sensor_readings
    ADD CONSTRAINT sensor_readings_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- Name: sensor_thresholds sensor_thresholds_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sensor_thresholds
    ADD CONSTRAINT sensor_thresholds_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- Name: settings settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: stock_ledger_entries stock_ledger_entries_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_ledger_entries
    ADD CONSTRAINT stock_ledger_entries_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id);


--
-- Name: stock_ledger_entries stock_ledger_entries_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_ledger_entries
    ADD CONSTRAINT stock_ledger_entries_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: stock_reservations stock_reservations_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_reservations
    ADD CONSTRAINT stock_reservations_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id);


--
-- Name: stock_reservations stock_reservations_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_reservations
    ADD CONSTRAINT stock_reservations_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: support_tickets support_tickets_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id);


--
-- Name: timesheets timesheets_project_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timesheets
    ADD CONSTRAINT timesheets_project_task_id_fkey FOREIGN KEY (project_task_id) REFERENCES public.project_tasks(id);


--
-- Name: user_permissions user_permissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id);


--
-- Name: user_roles user_roles_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: users users_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: vehicle_details vehicle_details_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_details
    ADD CONSTRAINT vehicle_details_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- Name: warehouses warehouses_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.warehouses(id);


--
-- Name: work_experiences work_experiences_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_experiences
    ADD CONSTRAINT work_experiences_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: workflow_action_logs workflow_action_logs_action_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_action_logs
    ADD CONSTRAINT workflow_action_logs_action_by_user_id_fkey FOREIGN KEY (action_by_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: workflow_action_logs workflow_action_logs_workflow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_action_logs
    ADD CONSTRAINT workflow_action_logs_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflows(id) ON DELETE CASCADE;


--
-- Name: workflow_states workflow_states_allow_edit_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_states
    ADD CONSTRAINT workflow_states_allow_edit_role_id_fkey FOREIGN KEY (allow_edit_role_id) REFERENCES public.roles(id) ON DELETE SET NULL;


--
-- Name: workflow_states workflow_states_workflow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_states
    ADD CONSTRAINT workflow_states_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflows(id) ON DELETE CASCADE;


--
-- Name: workflow_transitions workflow_transitions_allowed_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_transitions
    ADD CONSTRAINT workflow_transitions_allowed_role_id_fkey FOREIGN KEY (allowed_role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: workflow_transitions workflow_transitions_next_state_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_transitions
    ADD CONSTRAINT workflow_transitions_next_state_id_fkey FOREIGN KEY (next_state_id) REFERENCES public.workflow_states(id) ON DELETE CASCADE;


--
-- Name: workflow_transitions workflow_transitions_state_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_transitions
    ADD CONSTRAINT workflow_transitions_state_id_fkey FOREIGN KEY (state_id) REFERENCES public.workflow_states(id) ON DELETE CASCADE;


--
-- Name: workflow_transitions workflow_transitions_workflow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_transitions
    ADD CONSTRAINT workflow_transitions_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflows(id) ON DELETE CASCADE;


--
-- Name: workflows workflows_doctype_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflows
    ADD CONSTRAINT workflows_doctype_id_fkey FOREIGN KEY (doctype_id) REFERENCES public.doctypes(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict cB344NqKnUScKiECYEJaj0QadqUZ9z0pAe0rhyW0FuqzW3ft2O22JFRfc9pfp75

