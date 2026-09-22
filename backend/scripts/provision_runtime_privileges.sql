-- ADMIPAEDIA production runtime privilege provisioning
--
-- Purpose:
--   Run AFTER Alembic migrations and BEFORE application restart.
--
-- Required execution identity:
--   A migration/administrative connection able to SET ROLE
--   admipaedia_owner, or an already-active admipaedia_owner role.
--
-- Security contract:
--   * application runtime receives DML only
--   * runtime receives sequence USAGE/SELECT only
--   * runtime receives no table/schema ownership
--   * runtime receives no CREATE privilege on public schema
--   * PUBLIC receives no CREATE privilege on public schema
--   * future owner-created tables/sequences inherit equivalent grants
--
-- This file intentionally:
--   * contains no passwords or connection strings
--   * does not CREATE/ALTER LOGIN roles
--   * does not grant DDL privileges to the runtime role
--   * does not grant sequence UPDATE
--   * does not change object ownership

\set ON_ERROR_STOP on

BEGIN;

-- Fail closed if the expected roles are not provisioned.
DO $admipaedia_role_guard$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_roles
        WHERE rolname = 'admipaedia_owner'
    ) THEN
        RAISE EXCEPTION
            'Required role admipaedia_owner does not exist';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_roles
        WHERE rolname = 'admipaedia_runtime'
    ) THEN
        RAISE EXCEPTION
            'Required role admipaedia_runtime does not exist';
    END IF;
END
$admipaedia_role_guard$;

-- All privilege statements below execute as the schema-object owner.
SET LOCAL ROLE admipaedia_owner;

-- PUBLIC must never be able to create arbitrary objects in public.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- Runtime must be able to resolve objects in public, but not create them.
GRANT USAGE ON SCHEMA public TO admipaedia_runtime;
REVOKE CREATE ON SCHEMA public FROM admipaedia_runtime;

-- Existing application tables.
GRANT SELECT, INSERT, UPDATE, DELETE
ON ALL TABLES IN SCHEMA public
TO admipaedia_runtime;

-- Existing application sequences.
-- UPDATE is intentionally omitted.
GRANT USAGE, SELECT
ON ALL SEQUENCES IN SCHEMA public
TO admipaedia_runtime;

-- Future objects created by admipaedia_owner.
ALTER DEFAULT PRIVILEGES
FOR ROLE admipaedia_owner
IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLES
TO admipaedia_runtime;

ALTER DEFAULT PRIVILEGES
FOR ROLE admipaedia_owner
IN SCHEMA public
GRANT USAGE, SELECT
ON SEQUENCES
TO admipaedia_runtime;

-- Explicitly ensure future sequences do not acquire UPDATE
-- through a previously broader default grant.
ALTER DEFAULT PRIVILEGES
FOR ROLE admipaedia_owner
IN SCHEMA public
REVOKE UPDATE
ON SEQUENCES
FROM admipaedia_runtime;

COMMIT;