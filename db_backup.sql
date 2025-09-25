--
-- PostgreSQL database dump
--

\restrict ohUv0zB8PGJ2TFAlFDtXx0Klkg2YLjX1xDwR0trJwYtqtcQcimDxRqifKvW6R4b

-- Dumped from database version 17.6 (Debian 17.6-1.pgdg13+1)
-- Dumped by pg_dump version 17.6 (Debian 17.6-1.pgdg13+1)

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
-- Name: accepted_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accepted_data (
    admin_email character varying(100) NOT NULL,
    user_email character varying(100) NOT NULL,
    ref_id uuid NOT NULL,
    "position" character varying(50) NOT NULL,
    work_location character varying(100) NOT NULL,
    accepted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.accepted_data OWNER TO postgres;

--
-- Name: active_card_details; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.active_card_details (
    card_id integer NOT NULL,
    user_email text NOT NULL,
    name text NOT NULL,
    reg_no text NOT NULL,
    card_type text NOT NULL,
    date_of_expiration date NOT NULL,
    scheme_name text NOT NULL,
    qualifications text[] NOT NULL
);


ALTER TABLE public.active_card_details OWNER TO postgres;

--
-- Name: active_card_details_card_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.active_card_details_card_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.active_card_details_card_id_seq OWNER TO postgres;

--
-- Name: active_card_details_card_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.active_card_details_card_id_seq OWNED BY public.active_card_details.card_id;


--
-- Name: admin_employees; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_employees (
    admin_employee_id integer NOT NULL,
    admin_id integer NOT NULL,
    employee_id character varying(20) NOT NULL,
    "position" character varying(50) NOT NULL,
    work_location character varying(100) NOT NULL,
    start_date date NOT NULL,
    end_date date,
    status character varying(20) NOT NULL,
    CONSTRAINT admin_employees_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('inactive'::character varying)::text])))
);


ALTER TABLE public.admin_employees OWNER TO postgres;

--
-- Name: admin_employees_admin_employee_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.admin_employees_admin_employee_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admin_employees_admin_employee_id_seq OWNER TO postgres;

--
-- Name: admin_employees_admin_employee_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.admin_employees_admin_employee_id_seq OWNED BY public.admin_employees.admin_employee_id;


--
-- Name: admins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admins (
    admin_id integer NOT NULL,
    first_name character varying(50) NOT NULL,
    last_name character varying(50) NOT NULL,
    employee_id character varying(20) NOT NULL,
    organisation character varying(100) NOT NULL,
    email character varying(100) NOT NULL,
    password character varying(100) NOT NULL,
    date_of_birth date NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.admins OWNER TO postgres;

--
-- Name: admins_admin_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.admins_admin_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admins_admin_id_seq OWNER TO postgres;

--
-- Name: admins_admin_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.admins_admin_id_seq OWNED BY public.admins.admin_id;


--
-- Name: cert_details; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cert_details (
    cert_details_id integer NOT NULL,
    certificate_id integer NOT NULL,
    bucket_address text,
    json_address text,
    user_id integer NOT NULL
);


ALTER TABLE public.cert_details OWNER TO postgres;

--
-- Name: cert_details_cert_details_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.cert_details_cert_details_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cert_details_cert_details_id_seq OWNER TO postgres;

--
-- Name: cert_details_cert_details_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.cert_details_cert_details_id_seq OWNED BY public.cert_details.cert_details_id;


--
-- Name: cert_type; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cert_type (
    cert_type_id integer NOT NULL,
    type_name character varying(100) NOT NULL,
    description text
);


ALTER TABLE public.cert_type OWNER TO postgres;

--
-- Name: cert_type_cert_type_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.cert_type_cert_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cert_type_cert_type_id_seq OWNER TO postgres;

--
-- Name: cert_type_cert_type_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.cert_type_cert_type_id_seq OWNED BY public.cert_type.cert_type_id;


--
-- Name: certificates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.certificates (
    certificate_id integer NOT NULL,
    user_id integer NOT NULL,
    certificate_name character varying(100) NOT NULL,
    uploaded_date_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    check_progress character varying(20) DEFAULT 'Pending'::character varying NOT NULL,
    CONSTRAINT certificates_check_progress_check CHECK (((check_progress)::text = ANY (ARRAY[('Pending'::character varying)::text, ('completed'::character varying)::text, ('failed'::character varying)::text])))
);


ALTER TABLE public.certificates OWNER TO postgres;

--
-- Name: certificates_certificate_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.certificates_certificate_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.certificates_certificate_id_seq OWNER TO postgres;

--
-- Name: certificates_certificate_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.certificates_certificate_id_seq OWNED BY public.certificates.certificate_id;


--
-- Name: expired_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expired_data (
    admin_email character varying(100) NOT NULL,
    user_email character varying(100) NOT NULL,
    ref_id uuid NOT NULL,
    "position" character varying(50) NOT NULL,
    work_location character varying(100) NOT NULL,
    expired_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.expired_data OWNER TO postgres;

--
-- Name: id_verifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.id_verifications (
    identity_verification_id integer NOT NULL,
    user_id integer NOT NULL,
    id_image_url text NOT NULL,
    realtime_photo_url text NOT NULL,
    status character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    verified_at timestamp without time zone,
    CONSTRAINT id_verifications_status_check CHECK (((status)::text = ANY (ARRAY[('approved'::character varying)::text, ('rejected'::character varying)::text])))
);


ALTER TABLE public.id_verifications OWNER TO postgres;

--
-- Name: id_verifications_identity_verification_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.id_verifications_identity_verification_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.id_verifications_identity_verification_id_seq OWNER TO postgres;

--
-- Name: id_verifications_identity_verification_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.id_verifications_identity_verification_id_seq OWNED BY public.id_verifications.identity_verification_id;


--
-- Name: invitations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invitations (
    invitation_id integer NOT NULL,
    ref_id uuid NOT NULL,
    admin_email character varying(100) NOT NULL,
    user_email character varying(100) NOT NULL,
    invite_link character varying(100) NOT NULL,
    "position" character varying(50) NOT NULL,
    work_location character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone NOT NULL,
    status character varying(20) NOT NULL,
    CONSTRAINT invitations_status_check CHECK (((status)::text = ANY (ARRAY[('Pending'::character varying)::text, ('Accepted'::character varying)::text, ('Expired'::character varying)::text, ('Rejected'::character varying)::text])))
);


ALTER TABLE public.invitations OWNER TO postgres;

--
-- Name: invitations_invitation_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.invitations_invitation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.invitations_invitation_id_seq OWNER TO postgres;

--
-- Name: invitations_invitation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.invitations_invitation_id_seq OWNED BY public.invitations.invitation_id;


--
-- Name: pending_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pending_data (
    admin_email character varying(100) NOT NULL,
    user_email character varying(100) NOT NULL,
    ref_id uuid NOT NULL,
    "position" character varying(50) NOT NULL,
    work_location character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone NOT NULL
);


ALTER TABLE public.pending_data OWNER TO postgres;

--
-- Name: rejected_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rejected_data (
    admin_email character varying(100) NOT NULL,
    user_email character varying(100) NOT NULL,
    ref_id uuid NOT NULL,
    "position" character varying(50) NOT NULL,
    work_location character varying(100) NOT NULL,
    rejected_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.rejected_data OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    user_id integer NOT NULL,
    first_name character varying(50) NOT NULL,
    last_name character varying(50) NOT NULL,
    username character varying(100) NOT NULL,
    password character varying(1000) NOT NULL,
    date_of_birth date NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_user_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_user_id_seq OWNER TO postgres;

--
-- Name: users_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_user_id_seq OWNED BY public.users.user_id;


--
-- Name: active_card_details card_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.active_card_details ALTER COLUMN card_id SET DEFAULT nextval('public.active_card_details_card_id_seq'::regclass);


--
-- Name: admin_employees admin_employee_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_employees ALTER COLUMN admin_employee_id SET DEFAULT nextval('public.admin_employees_admin_employee_id_seq'::regclass);


--
-- Name: admins admin_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins ALTER COLUMN admin_id SET DEFAULT nextval('public.admins_admin_id_seq'::regclass);


--
-- Name: cert_details cert_details_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cert_details ALTER COLUMN cert_details_id SET DEFAULT nextval('public.cert_details_cert_details_id_seq'::regclass);


--
-- Name: cert_type cert_type_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cert_type ALTER COLUMN cert_type_id SET DEFAULT nextval('public.cert_type_cert_type_id_seq'::regclass);


--
-- Name: certificates certificate_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificates ALTER COLUMN certificate_id SET DEFAULT nextval('public.certificates_certificate_id_seq'::regclass);


--
-- Name: id_verifications identity_verification_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.id_verifications ALTER COLUMN identity_verification_id SET DEFAULT nextval('public.id_verifications_identity_verification_id_seq'::regclass);


--
-- Name: invitations invitation_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invitations ALTER COLUMN invitation_id SET DEFAULT nextval('public.invitations_invitation_id_seq'::regclass);


--
-- Name: users user_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN user_id SET DEFAULT nextval('public.users_user_id_seq'::regclass);


--
-- Data for Name: accepted_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.accepted_data (admin_email, user_email, ref_id, "position", work_location, accepted_at) FROM stdin;
admin1@gmail.com	sameerviswabharathi@gmail.com	32280cf4-327b-4059-bf52-f4bfca30feef	Infrastructure Manager	Ahmedabad	2025-07-14 13:58:03.860742
admin1@gmail.com	sameerviswabharathi@gmail.com	5ec913ed-2394-4412-8c11-cb3117927e25	CSCS	London	2025-07-29 10:56:03.591929
admin1@gmail.com	sameerviswabharathi@gmail.com	0e707b79-0712-4db0-a4f2-422c7b228159	Devops Engineer	Hyderabad	2025-07-29 12:39:32.770333
admin1@gmail.com	sameerviswabharathi@gmail.com	e00d3cc0-6b2a-4232-8ba2-ab1f1d820b70	Assistant Engineer	Wakanda	2025-08-06 11:12:16.590396
admin1@gmail.com	test89865@gmail.com	a1b2c3d4-e5f6-7890-abcd-ef1234567890	Software Engineer	Bangalore	2025-08-18 16:56:00
\.


--
-- Data for Name: active_card_details; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.active_card_details (card_id, user_email, name, reg_no, card_type, date_of_expiration, scheme_name, qualifications) FROM stdin;
2	sameerviswabharathi@gmail.com	STEPHEN KOWALCZYK	13442060	CSCS	2025-10-01	CSCS	{"1-Construction Operations Kerb & Channel Layer - NVQ Level 2"}
3	test89865@gmail.com	Stephen Kowalczyk	13442060	Skilled - Blue	2025-10-01	CSCS	{"1- Construction Operations Kerb & Channel Layer - NVQ Level 2","2- Groundworker - NVQ Certificate Level 2"}
4	test89865@gmail.com	Tan Doda	13386004	Skilled - Blue	2025-08-01	CSCS	{"1- Groundworker - NVQ Diploma Level 2"}
5	test89865@gmail.com	B Houlihan	40222976	Competent Operator	2026-05-01	CPCS	{"1- A58A:Excavator 360° below 10 tonnes - Tracked","2- A59A:Excavator 360° above 10 tonnes - Tracked"}
6	test89865@gmail.com	Frank Rock	1597077	Skilled - Blue	2029-11-01	CSCS	{"1- Groundworker - NVQ Certificate Level 2"}
7	test89865@gmail.com	Frank Rock	1597077	Skilled - Blue	2024-09-01	CSCS	{"1- Groundworker NVQ Level 2"}
9	test1111@gmail.com	Radu Motac	3286883	Skilled - Blue	2021-06-01	CSCS	{"1- General Construction Operations Level 2 NVQ Diploma"}
10	test1111@gmail.com	Radu Motac	3286883	Construction Site Operative	2017-08-01	CSCS	{"1- Construction Site Operative Industry Accreditation"}
11	test1111@gmail.com	S Feely	40408204	Competent Operator	2027-02-01	CPCS	{"1- A58A:Excavator 360° below 10 tonnes - Tracked","2- A59A:Excavator 360° above 10 tonnes - Tracked"}
12	test89865@gmail.com	David Mcgill	3831749	Skilled - Blue	2027-04-01	CSCS	{"1- Groundworker - NVQ Certificate Level 2"}
13	test89865@gmail.com	David McGill	3831749	Skilled - Blue	2022-03-01	CSCS	{"1- General Construction Operations Level 2 NVQ Diploma"}
14	test89865@gmail.com	David McGill	3831749	Skilled - Blue (LANTRA)	2019-09-01	CSCS	{"1- TTM Assessed Route","2- TTM 12D Mod 2 Op"}
\.


--
-- Data for Name: admin_employees; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_employees (admin_employee_id, admin_id, employee_id, "position", work_location, start_date, end_date, status) FROM stdin;
\.


--
-- Data for Name: admins; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admins (admin_id, first_name, last_name, employee_id, organisation, email, password, date_of_birth, created_at, updated_at) FROM stdin;
1	tony	stark	1	 Tony Industries	admin1@gmail.com	Sami@9515	1999-07-23	2025-07-07 18:00:01.849611	2025-07-07 18:00:01.849611
\.


--
-- Data for Name: cert_details; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cert_details (cert_details_id, certificate_id, bucket_address, json_address, user_id) FROM stdin;
1	3	{"message":"Certificate 'samson_tiara.png' uploaded successfully to 'user_2/certificates/'.","s3_path":"s3://certcheck-users/user_2/certificates/samson_tiara.png"}	/Users/sami/Desktop/certcheck/test_results/json_files/samson_tiara.json	2
2	5	s3://certcheck-users/user_2/certificates/sample_bosiet.jpeg	/Users/sami/Desktop/certcheck/test_results/json_files/sample_bosiet.json	2
3	6	s3://certcheck-users/user_2/certificates/sample_bosiet.jpeg	s3://certcheck-users/user_2/certificates/sample_bosiet.json	2
4	7	s3://certcheck-users/user_2/certificates/Screenshot 2025-07-18 at 10.36.09 AM.png	s3://certcheck-users/user_2/certificates/Screenshot 2025-07-18 at 10.36.09 AM.json	2
5	8	s3://certcheck-users/user_2/certificates/Screenshot 2025-07-18 at 10.39.48 AM.png	s3://certcheck-users/user_2/certificates/Screenshot 2025-07-18 at 10.39.48 AM.json	2
6	9	s3://certcheck-users/user_2/certificates/Screenshot 2025-07-18 at 10.39.48 AM.png	s3://certcheck-users/user_2/certificates/Screenshot 2025-07-18 at 10.39.48 AM.json	2
7	10	s3://certcheck-users/user_2/certificates/Screenshot 2025-07-18 at 10.39.48 AM.png	s3://certcheck-users/user_2/certificates/Screenshot 2025-07-18 at 10.39.48 AM.json	2
8	11	s3://certcheck-users/user_2/certificates/Screenshot 2025-07-18 at 10.39.48 AM.png	s3://certcheck-users/user_2/certificates/Screenshot 2025-07-18 at 10.39.48 AM.json	2
9	12	s3://certcheck-users/user_2/certificates/Screenshot 2025-07-18 at 10.39.48 AM.png	s3://certcheck-users/user_2/certificates/Screenshot 2025-07-18 at 10.39.48 AM.json	2
10	13	s3://certcheck-users/user_2/certificates/cscs.pdf	s3://certcheck-users/user_2/certificates/cscs.json	2
11	14	s3://certcheck-users/user_2/certificates/G Boglary cscs.pdf	s3://certcheck-users/user_2/certificates/G Boglary cscs.json	2
12	15	s3://certcheck-users/user_2/certificates/andrew locket cpcs.pdf	s3://certcheck-users/user_2/certificates/andrew locket cpcs.json	2
13	16	s3://certcheck-users/user_2/certificates/Radu Motac cscs.pdf	s3://certcheck-users/user_2/certificates/Radu Motac cscs.json	2
14	17	s3://certcheck-users/user_2/certificates/Tan Doda cscs.pdf	s3://certcheck-users/user_2/certificates/Tan Doda cscs.json	2
15	18	s3://certcheck-users/user_2/certificates/andrew locket cpcs.pdf	s3://certcheck-users/user_2/certificates/andrew locket cpcs.json	2
16	19	s3://certcheck-users/user_2/certificates/N Conway cpcs.pdf	s3://certcheck-users/user_2/certificates/N Conway cpcs.json	2
17	20	s3://certcheck-users/user_2/certificates/Rob Nicklinson cscs.pdf	s3://certcheck-users/user_2/certificates/Rob Nicklinson cscs.json	2
18	21	s3://certcheck-users/user_2/certificates/cscs.pdf	s3://certcheck-users/user_2/certificates/cscs.json	2
19	22	s3://certcheck-users/user_2/certificates/cscs.pdf	s3://certcheck-users/user_2/certificates/cscs.json	2
20	23	s3://certcheck-users/user_2/certificates/cscs.pdf	s3://certcheck-users/user_2/certificates/cscs.json	2
21	24	s3://certcheck-users/user_2/certificates/cscs.pdf	s3://certcheck-users/user_2/certificates/cscs.json	2
22	25	s3://certcheck-users/user_2/certificates/cscs.pdf	s3://certcheck-users/user_2/certificates/cscs.json	2
23	26	s3://certcheck-users/user_2/certificates/cscs.pdf	s3://certcheck-users/user_2/certificates/cscs.json	2
24	27	s3://certcheck-users/user_2/certificates/cscs.pdf	s3://certcheck-users/user_2/certificates/cscs.json	2
25	28	s3://certcheck-users/user_2/certificates/cscs.pdf	s3://certcheck-users/user_2/certificates/cscs.json	2
26	29	s3://certcheck-users/user_2/certificates/cscs.pdf	s3://certcheck-users/user_2/certificates/cscs.json	2
27	30	s3://certcheck-users/user_2/certificates/cscs.pdf	s3://certcheck-users/user_2/certificates/cscs.json	2
28	31	s3://certcheck-users/user_2/certificates/cscs.pdf	s3://certcheck-users/user_2/certificates/cscs.json	2
29	32	s3://certcheck-users/user_2/certificates/cscs.pdf	s3://certcheck-users/user_2/certificates/cscs.json	2
30	33	s3://certcheck-users/user_2/certificates/cscs.pdf	s3://certcheck-users/user_2/certificates/cscs.json	2
31	34	s3://certcheck-users/user_2/certificates/cscs.pdf	s3://certcheck-users/user_2/certificates/cscs.json	2
32	35	s3://certcheck-users/user_2/certificates/david mcgill cscs.pdf	s3://certcheck-users/user_2/certificates/david mcgill cscs.json	2
33	36	s3://certcheck-users/user_2/certificates/cscs.pdf	s3://certcheck-users/user_2/certificates/cscs.json	2
34	37	s3://certcheck-users/user_2/certificates/cscs.pdf	s3://certcheck-users/user_2/certificates/cscs.json	2
35	38	s3://certcheck-users/user_2/certificates/cscs.pdf	s3://certcheck-users/user_2/certificates/cscs.json	2
36	39	s3://certcheck-users/user_2/certificates/cscs.pdf	s3://certcheck-users/user_2/certificates/cscs.json	2
37	40	s3://certcheck-users/user_2/certificates/cscs.pdf	s3://certcheck-users/user_2/certificates/cscs.json	2
38	41	s3://certcheck-users/user_2/certificates/cscs.pdf	s3://certcheck-users/user_2/certificates/cscs.json	2
39	42	s3://certcheck-users/user_2/certificates/cscs.pdf	s3://certcheck-users/user_2/certificates/cscs.json	2
40	43	s3://certcheck-users/user_2/certificates/cscs.pdf	s3://certcheck-users/user_2/certificates/cscs.json	2
41	44	s3://certcheck-users/user_2/certificates/cscs.pdf	s3://certcheck-users/user_2/certificates/cscs.json	2
42	45	s3://certcheck-users/user_2/certificates/bernard Houlihan cpcs.pdf	s3://certcheck-users/user_2/certificates/bernard Houlihan cpcs.json	2
43	46	s3://certcheck-users/user_2/certificates/cscs.pdf	s3://certcheck-users/user_2/certificates/cscs.json	2
44	47	s3://certcheck-users/user_8/certificates/Seyhan Djemali cscs.pdf	s3://certcheck-users/user_8/certificates/Seyhan Djemali cscs.json	8
45	48	s3://certcheck-users/user_2/certificates/stephen feely cpcs.pdf	s3://certcheck-users/user_2/certificates/stephen feely cpcs.json	2
46	49	s3://certcheck-users/user_2/certificates/stephen feely cpcs.pdf	s3://certcheck-users/user_2/certificates/stephen feely cpcs.json	2
47	50	s3://certcheck-users/user_2/certificates/stephen feely cpcs.pdf	s3://certcheck-users/user_2/certificates/stephen feely cpcs.json	2
48	51	s3://certcheck-users/user_2/certificates/stephen feely cpcs.pdf	s3://certcheck-users/user_2/certificates/stephen feely cpcs.json	2
49	52	s3://certcheck-users/user_8/certificates/stephen feely cpcs.pdf	s3://certcheck-users/user_8/certificates/stephen feely cpcs.json	8
50	53	s3://certcheck-users/user_8/certificates/stephen feely cpcs.pdf	s3://certcheck-users/user_8/certificates/stephen feely cpcs.json	8
51	54	s3://certcheck-users/user_8/certificates/stephen feely cpcs.pdf	s3://certcheck-users/user_8/certificates/stephen feely cpcs.json	8
52	55	s3://certcheck-users/user_8/certificates/Seyhan Djemali cscs.pdf	s3://certcheck-users/user_8/certificates/Seyhan Djemali cscs.json	8
53	56	s3://certcheck-users/user_8/certificates/Seyhan Djemali cscs.pdf	s3://certcheck-users/user_8/certificates/Seyhan Djemali cscs.json	8
54	57	s3://certcheck-users/user_8/certificates/Seyhan Djemali cscs.pdf	s3://certcheck-users/user_8/certificates/Seyhan Djemali cscs.json	8
55	58	s3://certcheck-users/user_8/certificates/Seyhan Djemali cscs.pdf	s3://certcheck-users/user_8/certificates/Seyhan Djemali cscs.json	8
56	59	s3://certcheck-users/user_8/certificates/cscs.pdf	s3://certcheck-users/user_8/certificates/cscs.json	8
57	60	s3://certcheck-users/user_8/certificates/cscs.pdf	s3://certcheck-users/user_8/certificates/cscs.json	8
58	61	s3://certcheck-users/user_8/certificates/HARRISON NICHOLAS CSCS.pdf	s3://certcheck-users/user_8/certificates/HARRISON NICHOLAS CSCS.json	8
59	62	s3://certcheck-users/user_8/certificates/HARRISON NICHOLAS CSCS.pdf	s3://certcheck-users/user_8/certificates/HARRISON NICHOLAS CSCS.json	8
60	63	s3://certcheck-users/user_8/certificates/cscs.pdf	s3://certcheck-users/user_8/certificates/cscs.json	8
61	64	s3://certcheck-users/user_8/certificates/cscs.pdf	s3://certcheck-users/user_8/certificates/cscs.json	8
62	65	s3://certcheck-users/user_8/certificates/cscs.pdf	s3://certcheck-users/user_8/certificates/cscs.json	8
63	66	s3://certcheck-users/user_8/certificates/cscs.pdf	s3://certcheck-users/user_8/certificates/cscs.json	8
64	67	s3://certcheck-users/user_8/certificates/cscs.pdf	s3://certcheck-users/user_8/certificates/cscs.json	8
65	68	s3://certcheck-users/user_8/certificates/cscs.pdf	s3://certcheck-users/user_8/certificates/cscs.json	8
66	69	s3://certcheck-users/user_8/certificates/cscs.pdf	s3://certcheck-users/user_8/certificates/cscs.json	8
67	70	s3://certcheck-users/user_8/certificates/cscs.pdf	s3://certcheck-users/user_8/certificates/cscs.json	8
68	71	s3://certcheck-users/user_8/certificates/cscs.pdf	s3://certcheck-users/user_8/certificates/cscs.json	8
69	72	s3://certcheck-users/user_8/certificates/Tan Doda cscs.pdf	s3://certcheck-users/user_8/certificates/Tan Doda cscs.json	8
70	73	s3://certcheck-users/user_8/certificates/bernard Houlihan cpcs.pdf	s3://certcheck-users/user_8/certificates/bernard Houlihan cpcs.json	8
71	74	s3://certcheck-users/user_8/certificates/F Rock cscs.pdf	s3://certcheck-users/user_8/certificates/F Rock cscs.json	8
72	75	s3://certcheck-users/user_8/certificates/F Rock cscs.pdf	s3://certcheck-users/user_8/certificates/F Rock cscs.json	8
73	76	s3://certcheck-users/user_8/certificates/N Conway cscs.pdf	s3://certcheck-users/user_8/certificates/N Conway cscs.json	8
74	77	s3://certcheck-users/user_9/certificates/Tan Doda cscs.pdf	s3://certcheck-users/user_9/certificates/Tan Doda cscs.json	9
75	78	s3://certcheck-users/user_9/certificates/Tan Doda cscs.pdf	s3://certcheck-users/user_9/certificates/Tan Doda cscs.json	9
76	79	s3://certcheck-users/user_9/certificates/Radu Motac cscs.pdf	s3://certcheck-users/user_9/certificates/Radu Motac cscs.json	9
77	80	s3://certcheck-users/user_9/certificates/Radu Motac cscs.pdf	s3://certcheck-users/user_9/certificates/Radu Motac cscs.json	9
78	81	s3://certcheck-users/user_9/certificates/stephen feely cpcs.pdf	s3://certcheck-users/user_9/certificates/stephen feely cpcs.json	9
79	82	s3://certcheck-users/user_2/certificates/Seyhan Djemali cscs.pdf	s3://certcheck-users/user_2/certificates/Seyhan Djemali cscs.json	2
80	83	s3://certcheck-users/user_8/certificates/F Rock cscs.pdf	s3://certcheck-users/user_8/certificates/F Rock cscs.json	8
81	84	s3://certcheck-users/user_8/certificates/N Conway cscs.pdf	s3://certcheck-users/user_8/certificates/N Conway cscs.json	8
82	85	s3://certcheck-users/user_8/certificates/HARRISON NICHOLAS CSCS.pdf	s3://certcheck-users/user_8/certificates/HARRISON NICHOLAS CSCS.json	8
83	86	s3://certcheck-users/user_8/certificates/F Rock cscs.pdf	s3://certcheck-users/user_8/certificates/F Rock cscs.json	8
84	87	s3://certcheck-users/user_8/certificates/david mcgill cscs.pdf	s3://certcheck-users/user_8/certificates/david mcgill cscs.json	8
85	88	s3://certcheck-users/user_8/certificates/david mcgill cscs.pdf	s3://certcheck-users/user_8/certificates/david mcgill cscs.json	8
86	89	s3://certcheck-users/user_8/certificates/david mcgill cscs.pdf	s3://certcheck-users/user_8/certificates/david mcgill cscs.json	8
\.


--
-- Data for Name: cert_type; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cert_type (cert_type_id, type_name, description) FROM stdin;
\.


--
-- Data for Name: certificates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.certificates (certificate_id, user_id, certificate_name, uploaded_date_time, check_progress) FROM stdin;
1	2	Screenshot 2025-05-20 at 12.50.13 PM.png	2025-07-16 14:56:15.055997	Pending
2	2	Screenshot 2025-05-20 at 12.50.13 PM.png	2025-07-16 14:56:28.73248	Pending
3	2	samson_tiara.png	2025-07-16 14:56:51.068693	Pending
5	2	sample_bosiet.jpeg	2025-07-16 15:10:00.234752	Pending
6	2	sample_bosiet.jpeg	2025-07-16 15:14:45.077013	Pending
7	2	Screenshot 2025-07-18 at 10.36.09 AM.png	2025-07-18 12:06:31.44661	Pending
8	2	Screenshot 2025-07-18 at 10.39.48 AM.png	2025-07-18 12:10:10.28729	Pending
9	2	Screenshot 2025-07-18 at 10.39.48 AM.png	2025-07-18 13:49:09.682485	Pending
10	2	Screenshot 2025-07-18 at 10.39.48 AM.png	2025-07-18 13:52:24.200667	Pending
11	2	Screenshot 2025-07-18 at 10.39.48 AM.png	2025-07-18 13:56:01.28681	Pending
12	2	Screenshot 2025-07-18 at 10.39.48 AM.png	2025-07-18 16:46:00.289657	Pending
13	2	cscs.pdf	2025-07-29 09:05:24.559959	Pending
14	2	G Boglary cscs.pdf	2025-07-29 09:15:11.198729	Pending
15	2	andrew locket cpcs.pdf	2025-07-29 09:20:51.102435	Pending
16	2	Radu Motac cscs.pdf	2025-07-29 09:44:55.657389	Pending
17	2	Tan Doda cscs.pdf	2025-07-29 10:56:59.328927	Pending
18	2	andrew locket cpcs.pdf	2025-07-29 12:08:35.104018	Pending
19	2	N Conway cpcs.pdf	2025-07-29 12:33:40.550296	Pending
20	2	Rob Nicklinson cscs.pdf	2025-07-30 11:05:32.281575	Pending
21	2	cscs.pdf	2025-07-30 11:10:54.056757	Pending
22	2	cscs.pdf	2025-07-30 11:15:10.333049	Pending
23	2	cscs.pdf	2025-07-30 11:22:21.69237	Pending
24	2	cscs.pdf	2025-07-30 11:24:27.648221	Pending
25	2	cscs.pdf	2025-07-30 11:32:54.107208	Pending
26	2	cscs.pdf	2025-07-30 11:34:27.224727	Pending
27	2	cscs.pdf	2025-07-30 11:36:08.016709	Pending
28	2	cscs.pdf	2025-07-30 11:36:53.362216	Pending
29	2	cscs.pdf	2025-07-30 11:52:06.584075	Pending
30	2	cscs.pdf	2025-07-30 11:56:57.57798	Pending
31	2	cscs.pdf	2025-07-30 12:00:01.50385	Pending
32	2	cscs.pdf	2025-07-30 12:14:59.685817	Pending
33	2	cscs.pdf	2025-07-30 12:23:49.927635	Pending
34	2	cscs.pdf	2025-07-30 12:29:07.688438	Pending
35	2	david mcgill cscs.pdf	2025-07-30 13:15:00.989413	Pending
36	2	cscs.pdf	2025-07-31 06:01:40.184011	Pending
37	2	cscs.pdf	2025-08-01 05:22:50.880268	Pending
38	2	cscs.pdf	2025-08-01 05:29:33.943211	Pending
39	2	cscs.pdf	2025-08-01 05:52:21.946579	Pending
40	2	cscs.pdf	2025-08-01 05:57:10.06683	Pending
41	2	cscs.pdf	2025-08-04 08:39:35.319503	Pending
42	2	cscs.pdf	2025-08-04 11:23:00.797986	Pending
43	2	cscs.pdf	2025-08-04 11:34:29.505015	Pending
44	2	cscs.pdf	2025-08-06 10:17:44.672375	Pending
45	2	bernard Houlihan cpcs.pdf	2025-08-06 10:59:01.469487	Pending
46	2	cscs.pdf	2025-08-06 11:10:02.809411	Pending
47	8	Seyhan Djemali cscs.pdf	2025-08-07 06:15:14.912887	Pending
48	2	stephen feely cpcs.pdf	2025-08-07 06:27:02.741159	Pending
49	2	stephen feely cpcs.pdf	2025-08-07 06:28:35.235056	Pending
50	2	stephen feely cpcs.pdf	2025-08-07 06:29:38.441172	Pending
51	2	stephen feely cpcs.pdf	2025-08-07 06:32:37.278799	Pending
52	8	stephen feely cpcs.pdf	2025-08-07 06:38:05.829095	Pending
53	8	stephen feely cpcs.pdf	2025-08-07 07:10:20.981013	Pending
54	8	stephen feely cpcs.pdf	2025-08-07 07:32:22.408485	Pending
55	8	Seyhan Djemali cscs.pdf	2025-08-07 07:45:02.99004	Pending
56	8	Seyhan Djemali cscs.pdf	2025-08-07 07:55:49.188202	Pending
57	8	Seyhan Djemali cscs.pdf	2025-08-07 08:00:24.219452	Pending
58	8	Seyhan Djemali cscs.pdf	2025-08-07 08:20:18.195004	Pending
59	8	cscs.pdf	2025-08-07 08:22:08.974365	Pending
60	8	cscs.pdf	2025-08-07 08:24:31.306455	Pending
61	8	HARRISON NICHOLAS CSCS.pdf	2025-08-07 08:49:48.615869	Pending
62	8	HARRISON NICHOLAS CSCS.pdf	2025-08-07 08:51:24.920662	Pending
63	8	cscs.pdf	2025-08-07 10:32:34.233623	Pending
64	8	cscs.pdf	2025-08-07 10:41:36.421625	Pending
65	8	cscs.pdf	2025-08-07 10:45:42.120301	Pending
66	8	cscs.pdf	2025-08-08 06:12:02.658095	Pending
67	8	cscs.pdf	2025-08-08 06:31:44.803111	Pending
68	8	cscs.pdf	2025-08-08 08:12:30.336888	Pending
69	8	cscs.pdf	2025-08-08 08:40:37.654479	Pending
70	8	cscs.pdf	2025-08-08 08:54:10.78378	Pending
71	8	cscs.pdf	2025-08-08 08:56:12.789859	Pending
72	8	Tan Doda cscs.pdf	2025-08-08 09:01:44.887027	Pending
73	8	bernard Houlihan cpcs.pdf	2025-08-08 10:04:59.011569	Pending
74	8	F Rock cscs.pdf	2025-08-11 04:24:17.426745	Pending
75	8	F Rock cscs.pdf	2025-08-11 04:27:55.262133	Pending
76	8	N Conway cscs.pdf	2025-08-11 08:10:31.15955	Pending
77	9	Tan Doda cscs.pdf	2025-08-11 08:22:30.079681	Pending
78	9	Tan Doda cscs.pdf	2025-08-11 08:23:40.83818	Pending
79	9	Radu Motac cscs.pdf	2025-08-11 08:25:49.462438	Pending
80	9	Radu Motac cscs.pdf	2025-08-11 08:27:24.536645	Pending
81	9	stephen feely cpcs.pdf	2025-08-11 08:30:32.171692	Pending
82	2	Seyhan Djemali cscs.pdf	2025-08-12 05:16:37.064154	Pending
83	8	F Rock cscs.pdf	2025-08-15 05:11:04.896463	Pending
84	8	N Conway cscs.pdf	2025-08-15 05:14:48.967902	Pending
85	8	HARRISON NICHOLAS CSCS.pdf	2025-08-15 05:27:19.393988	Pending
86	8	F Rock cscs.pdf	2025-08-15 06:01:00.296155	Pending
87	8	david mcgill cscs.pdf	2025-08-15 06:12:43.255495	Pending
88	8	david mcgill cscs.pdf	2025-08-15 06:20:24.41956	Pending
89	8	david mcgill cscs.pdf	2025-08-15 06:22:40.733279	Pending
\.


--
-- Data for Name: expired_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expired_data (admin_email, user_email, ref_id, "position", work_location, expired_at) FROM stdin;
\.


--
-- Data for Name: id_verifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.id_verifications (identity_verification_id, user_id, id_image_url, realtime_photo_url, status, created_at, updated_at, verified_at) FROM stdin;
1	1	s3://certcheck-users/user_1/Usa_DL.JPG	s3://certcheck-users/user_1/real_time_captured.jpg	approved	2025-07-08 11:13:10.777744	2025-07-08 11:13:10.777744	2025-07-08 11:13:10.777744
2	2	s3://certcheck-users/user_2/Usa_DL.JPG	s3://certcheck-users/user_2/real_time_captured.jpg	approved	2025-07-10 12:37:13.988566	2025-07-10 12:37:13.988566	2025-07-10 12:37:13.988566
3	8	s3://certcheck-users/user_8/IMG_1455.JPG	s3://certcheck-users/user_8/real_time_captured.jpg	approved	2025-08-07 06:13:24.656149	2025-08-07 06:13:24.656149	2025-08-07 06:13:24.656149
4	9	s3://certcheck-users/user_9/IMG_1455.JPG	s3://certcheck-users/user_9/real_time_captured.jpg	rejected	2025-08-11 08:21:11.191742	2025-08-11 08:21:11.191742	2025-08-11 08:21:11.191742
5	9	s3://certcheck-users/user_9/IMG_1455.JPG	s3://certcheck-users/user_9/real_time_captured.jpg	rejected	2025-08-11 08:21:13.589103	2025-08-11 08:21:13.589103	2025-08-11 08:21:13.589103
6	9	s3://certcheck-users/user_9/captured.png	s3://certcheck-users/user_9/real_time_captured.jpg	approved	2025-08-11 08:22:03.270392	2025-08-11 08:22:03.270392	2025-08-11 08:22:03.270392
\.


--
-- Data for Name: invitations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invitations (invitation_id, ref_id, admin_email, user_email, invite_link, "position", work_location, created_at, expires_at, status) FROM stdin;
2	8d92f222-e7fa-43dc-8423-66f51b5baba7	admin1@gmail.com	sameerviswabharathi@gmail.com	http://localhost:8080/login?consent=False&ref_id=8d92f222-e7fa-43dc-8423-66f51b5baba7	Devops Engineer	Hyderabad	2025-07-14 12:15:13.388145	2025-07-21 10:45:13.391777	Accepted
3	8616b5f5-354d-49fc-a23c-2d4ee4392460	admin1@gmail.com	sameerviswabharathi@gmail.com	http://localhost:8080/login?consent=False&ref_id=8616b5f5-354d-49fc-a23c-2d4ee4392460	AI Engineer	Bangalore	2025-07-14 13:29:07.219724	2025-07-21 11:59:07.223296	Rejected
4	32280cf4-327b-4059-bf52-f4bfca30feef	admin1@gmail.com	sameerviswabharathi@gmail.com	http://localhost:8080/login?consent=False&ref_id=32280cf4-327b-4059-bf52-f4bfca30feef	Infrastructure Manager	Ahmedabad	2025-07-14 13:57:21.151105	2025-07-21 12:27:21.159261	Accepted
5	b5d1d83b-e86f-4bda-8d6c-a41e25de533c	admin1@gmail.com	sameerviswabharathi@gmail.com	http://localhost:8080/login?consent=False&ref_id=b5d1d83b-e86f-4bda-8d6c-a41e25de533c	Professor	New york	2025-07-16 10:20:09.235435	2025-07-23 08:50:09.241382	Pending
7	5ec913ed-2394-4412-8c11-cb3117927e25	admin1@gmail.com	sameerviswabharathi@gmail.com	http://localhost:8080/login?consent=False&ref_id=5ec913ed-2394-4412-8c11-cb3117927e25	CSCS	London	2025-07-29 10:54:35.597411	2025-08-05 10:54:35.607358	Accepted
8	0e707b79-0712-4db0-a4f2-422c7b228159	admin1@gmail.com	sameerviswabharathi@gmail.com	http://localhost:8080/login?consent=False&ref_id=0e707b79-0712-4db0-a4f2-422c7b228159	Devops Engineer	Hyderabad	2025-07-29 12:38:13.93628	2025-08-05 12:38:13.943667	Accepted
6	e00d3cc0-6b2a-4232-8ba2-ab1f1d820b70	admin1@gmail.com	sameerviswabharathi@gmail.com	http://localhost:8080/login?consent=False&ref_id=e00d3cc0-6b2a-4232-8ba2-ab1f1d820b70	Assistant Engineer	Wakanda	2025-07-17 18:11:51.574651	2025-07-24 16:41:51.577755	Accepted
\.


--
-- Data for Name: pending_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pending_data (admin_email, user_email, ref_id, "position", work_location, created_at, expires_at) FROM stdin;
admin1@gmail.com	sameerviswabharathi@gmail.com	8616b5f5-354d-49fc-a23c-2d4ee4392460	AI Engineer	Bangalore	2025-07-14 11:59:07.236686	2025-07-21 11:59:07.236697
admin1@gmail.com	sameerviswabharathi@gmail.com	32280cf4-327b-4059-bf52-f4bfca30feef	Infrastructure Manager	Ahmedabad	2025-07-14 12:27:21.170756	2025-07-21 12:27:21.170767
admin1@gmail.com	sameerviswabharathi@gmail.com	b5d1d83b-e86f-4bda-8d6c-a41e25de533c	Professor	New york	2025-07-16 08:50:09.250727	2025-07-23 08:50:09.250735
admin1@gmail.com	sameerviswabharathi@gmail.com	e00d3cc0-6b2a-4232-8ba2-ab1f1d820b70	Assistant Engineer	Wakanda	2025-07-17 16:41:51.590088	2025-07-24 16:41:51.590091
admin1@gmail.com	sameerviswabharathi@gmail.com	5ec913ed-2394-4412-8c11-cb3117927e25	CSCS	London	2025-07-29 10:54:35.627567	2025-08-05 10:54:35.627572
admin1@gmail.com	sameerviswabharathi@gmail.com	0e707b79-0712-4db0-a4f2-422c7b228159	Devops Engineer	Hyderabad	2025-07-29 12:38:13.951169	2025-08-05 12:38:13.951176
\.


--
-- Data for Name: rejected_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rejected_data (admin_email, user_email, ref_id, "position", work_location, rejected_at) FROM stdin;
admin1@gmail.com	sameerviswabharathi@gmail.com	8616b5f5-354d-49fc-a23c-2d4ee4392460	AI Engineer	Bangalore	2025-07-14 13:30:43.33782
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (user_id, first_name, last_name, username, password, date_of_birth, created_at, updated_at) FROM stdin;
1	Jhonny	Depp	test3@gmail.com	$2b$12$P8y0/UbzqUiVH/o2PiSVvOj7vx3oGZPD4gfQv0lzMvktA2oAeVUVG	1993-11-07	2025-07-07 17:45:47.076606	2025-07-07 17:45:47.076606
2	sameer	shaik	sameerviswabharathi@gmail.com	$2b$12$iOp13k.vFtCmO6qxsg/LKe2TpQdTX0z4g6CVxzaNSvDPW/bbPKrbq	2000-07-02	2025-07-09 13:07:01.703383	2025-07-09 13:07:01.703383
3	tim	hortons	test4@gmail.com	$2b$12$17wcV9iHiu9QM1f8JYEwMuIVb8ZKCtRO3GhFajycIEK5XZENsJBBS	2025-07-12	2025-07-16 11:46:43.204629	2025-07-16 11:46:43.204629
4	Shyam	Sid	testsampleemail@gmail.com	$2b$12$quOCgL/dlt1cCElmnP77M.EPnD80UvJxiyFLCDi3yZBEbSXeOIfSS	2000-06-02	2025-07-22 16:17:41.096309	2025-07-22 16:17:41.096309
5	samuel	samar	test8@gmail.com	$2b$12$V2YaTWXhsJvNXytiAtXq4.j87fakNbcOZKSxu1dGYIjS4JscyZnL.	2014-03-14	2025-08-06 09:57:08.465325	2025-08-06 09:57:08.465325
6	asm	tom	test56565@gmail.com	$2b$12$gpufYSfsybeuW4hdJj1PI.AT5RpTyf6LGCYE6KVPDVvJ2MwvzZWYq	2014-07-18	2025-08-06 10:19:18.861835	2025-08-06 10:19:18.861835
7	Sameul	John	test89498465@gmail.com	$2b$12$Kt8xlgb9LHoD2OkMwXeJqeQuweaUeoDhHKtssfkJ8Jev8XsLcYBd6	2007-07-06	2025-08-06 11:04:17.629805	2025-08-06 11:04:17.629805
8	shafi	shaik	test89865@gmail.com	$2b$12$5MAf.QP/aUEah11Cu0YeAO.MQevqkcL.As/qAhklu0C0GQwPmO6fG	2002-02-09	2025-08-07 05:05:35.746829	2025-08-07 05:05:35.746829
9	samson	Sanju	test1111@gmail.com	$2b$12$akeB7ud8AmMvjTrgJmqUbutQbvuO1B8BJNk/lLVvrDApXPQgM/wxq	1990-01-17	2025-08-11 08:18:43.199714	2025-08-11 08:18:43.199714
\.


--
-- Name: active_card_details_card_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.active_card_details_card_id_seq', 14, true);


--
-- Name: admin_employees_admin_employee_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.admin_employees_admin_employee_id_seq', 1, false);


--
-- Name: admins_admin_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.admins_admin_id_seq', 1, true);


--
-- Name: cert_details_cert_details_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cert_details_cert_details_id_seq', 86, true);


--
-- Name: cert_type_cert_type_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cert_type_cert_type_id_seq', 1, false);


--
-- Name: certificates_certificate_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.certificates_certificate_id_seq', 89, true);


--
-- Name: id_verifications_identity_verification_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.id_verifications_identity_verification_id_seq', 6, true);


--
-- Name: invitations_invitation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.invitations_invitation_id_seq', 8, true);


--
-- Name: users_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_user_id_seq', 9, true);


--
-- Name: active_card_details active_card_details_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.active_card_details
    ADD CONSTRAINT active_card_details_pkey PRIMARY KEY (card_id);


--
-- Name: admin_employees admin_employees_employee_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_employees
    ADD CONSTRAINT admin_employees_employee_id_key UNIQUE (employee_id);


--
-- Name: admin_employees admin_employees_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_employees
    ADD CONSTRAINT admin_employees_pkey PRIMARY KEY (admin_employee_id);


--
-- Name: admins admins_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_email_key UNIQUE (email);


--
-- Name: admins admins_employee_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_employee_id_key UNIQUE (employee_id);


--
-- Name: admins admins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (admin_id);


--
-- Name: cert_details cert_details_certificate_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cert_details
    ADD CONSTRAINT cert_details_certificate_id_key UNIQUE (certificate_id);


--
-- Name: cert_details cert_details_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cert_details
    ADD CONSTRAINT cert_details_pkey PRIMARY KEY (cert_details_id);


--
-- Name: cert_type cert_type_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cert_type
    ADD CONSTRAINT cert_type_pkey PRIMARY KEY (cert_type_id);


--
-- Name: certificates certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_pkey PRIMARY KEY (certificate_id);


--
-- Name: id_verifications id_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.id_verifications
    ADD CONSTRAINT id_verifications_pkey PRIMARY KEY (identity_verification_id);


--
-- Name: invitations invitations_invite_link_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_invite_link_key UNIQUE (invite_link);


--
-- Name: invitations invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_pkey PRIMARY KEY (invitation_id);


--
-- Name: active_card_details unique_card_details; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.active_card_details
    ADD CONSTRAINT unique_card_details UNIQUE (reg_no, name, card_type, date_of_expiration, qualifications);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_cert_details_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cert_details_user_id ON public.cert_details USING btree (user_id);


--
-- Name: idx_cert_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cert_id ON public.cert_details USING btree (certificate_id);


--
-- Name: idx_cert_type_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_cert_type_name ON public.cert_type USING btree (type_name);


--
-- Name: idx_check_progress; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_check_progress ON public.certificates USING btree (check_progress);


--
-- Name: idx_employee_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_employee_id ON public.admins USING btree (employee_id);


--
-- Name: idx_id_verify_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_id_verify_status ON public.id_verifications USING btree (status);


--
-- Name: idx_id_verify_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_id_verify_user_id ON public.id_verifications USING btree (user_id);


--
-- Name: idx_invitation_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invitation_email ON public.invitations USING btree (admin_email);


--
-- Name: idx_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_id ON public.certificates USING btree (user_id);


--
-- Name: idx_username; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_username ON public.users USING btree (username);


--
-- Name: admins update_admins_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON public.admins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: id_verifications update_id_verifications_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_id_verifications_updated_at BEFORE UPDATE ON public.id_verifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: accepted_data accepted_data_admin_email_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accepted_data
    ADD CONSTRAINT accepted_data_admin_email_fkey FOREIGN KEY (admin_email) REFERENCES public.admins(email) ON DELETE CASCADE;


--
-- Name: admin_employees admin_employees_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_employees
    ADD CONSTRAINT admin_employees_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admins(admin_id) ON DELETE CASCADE;


--
-- Name: cert_details cert_details_certificate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cert_details
    ADD CONSTRAINT cert_details_certificate_id_fkey FOREIGN KEY (certificate_id) REFERENCES public.certificates(certificate_id) ON DELETE CASCADE;


--
-- Name: cert_details cert_details_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cert_details
    ADD CONSTRAINT cert_details_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: certificates certificates_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: expired_data expired_data_admin_email_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expired_data
    ADD CONSTRAINT expired_data_admin_email_fkey FOREIGN KEY (admin_email) REFERENCES public.admins(email) ON DELETE CASCADE;


--
-- Name: id_verifications id_verifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.id_verifications
    ADD CONSTRAINT id_verifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: pending_data pending_data_admin_email_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pending_data
    ADD CONSTRAINT pending_data_admin_email_fkey FOREIGN KEY (admin_email) REFERENCES public.admins(email) ON DELETE CASCADE;


--
-- Name: rejected_data rejected_data_admin_email_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rejected_data
    ADD CONSTRAINT rejected_data_admin_email_fkey FOREIGN KEY (admin_email) REFERENCES public.admins(email) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict ohUv0zB8PGJ2TFAlFDtXx0Klkg2YLjX1xDwR0trJwYtqtcQcimDxRqifKvW6R4b

