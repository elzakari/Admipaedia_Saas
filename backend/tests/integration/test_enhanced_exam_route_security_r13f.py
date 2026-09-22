"""
V28-R13F dormant enhanced-exam route activation-security contracts.

IMPORTANT:
- enhanced_exams_bp remains dormant.
- These tests do not register the blueprint.
- Structural tests describe requirements that must be satisfied before
  a separate product decision can activate the enhanced routes.
"""

import ast
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]

ENHANCED_ROUTES = (
    ROOT
    / "app"
    / "api"
    / "v1"
    / "exams"
    / "enhanced_routes.py"
)

RBAC_SERVICE = (
    ROOT
    / "app"
    / "services"
    / "rbac_service.py"
)


def _source(path):
    return path.read_text(encoding="utf-8-sig")


def _tree(path):
    return ast.parse(_source(path))


def _function(path, name):
    source = _source(path)
    tree = ast.parse(source)

    node = next(
        (
            item
            for item in tree.body
            if isinstance(item, ast.FunctionDef)
            and item.name == name
        ),
        None,
    )

    assert node is not None, f"{name} not found"

    return node, ast.get_source_segment(source, node) or ""


def _decorators(path, name):
    source = _source(path)
    node, _ = _function(path, name)

    return [
        ast.get_source_segment(source, decorator) or ""
        for decorator in node.decorator_list
    ]


def _permission_definitions():
    """
    Return permission names declared in the default RBAC permission
    bootstrap. This deliberately examines definitions, not route strings.
    """
    source = _source(RBAC_SERVICE)
    tree = ast.parse(source)

    names = set()

    for node in ast.walk(tree):
        if not isinstance(node, ast.Dict):
            continue

        values = {}

        for key, value in zip(node.keys, node.values):
            if (
                isinstance(key, ast.Constant)
                and isinstance(key.value, str)
                and isinstance(value, ast.Constant)
            ):
                values[key.value] = value.value

        name = values.get("name")

        if (
            isinstance(name, str)
            and "." in name
        ):
            names.add(name)

    return names


def test_enhanced_blueprint_has_single_deliberate_registration_site():
    """
    Post-R13G lifecycle invariant: enhanced exam activation
    must exist at exactly one deliberate production site.
    """
    registration_hits = []

    expected = Path("app/api/v1/exams/__init__.py")

    for path in (ROOT / "app").rglob("*.py"):
        if path == ENHANCED_ROUTES:
            continue

        text = _source(path)

        if (
            "enhanced_exams_bp" in text
            and (
                "register_blueprint" in text
                or "enhanced_routes import" in text
            )
        ):
            registration_hits.append(
                path.relative_to(ROOT)
            )

    assert registration_hits == [expected], (
        "Enhanced exam blueprint must have exactly one "
        "deliberate production registration site; "
        f"found: {registration_hits}"
    )


def test_duration_route_requires_explicit_exam_permission():
    decorators = _decorators(
        ENHANCED_ROUTES,
        "calculate_optimal_duration",
    )

    assert any(
        'require_permission("exam.' in decorator
        or "require_permission('exam." in decorator
        for decorator in decorators
    ), (
        "duration/calculate is JWT-only; "
        "future activation requires an explicit exam permission"
    )


def test_every_enhanced_route_permission_is_defined_by_rbac():
    """
    A dormant route must not depend on a permission absent from the
    default permission bootstrap.
    """
    defined = _permission_definitions()

    source = _source(ENHANCED_ROUTES)
    tree = ast.parse(source)

    required = set()

    for node in tree.body:
        if not isinstance(node, ast.FunctionDef):
            continue

        for decorator in node.decorator_list:
            text = ast.get_source_segment(
                source,
                decorator,
            ) or ""

            if not text.startswith(
                "require_permission("
            ):
                continue

            call = decorator

            if (
                isinstance(call, ast.Call)
                and call.args
                and isinstance(
                    call.args[0],
                    ast.Constant,
                )
                and isinstance(
                    call.args[0].value,
                    str,
                )
            ):
                required.add(
                    call.args[0].value
                )

    missing = required - defined

    assert missing == set(), (
        "Enhanced routes reference undefined "
        f"default RBAC permissions: {sorted(missing)}"
    )


def test_schedule_route_has_resource_authorization_before_service_call():
    """
    exam.read is granted to teacher/student/parent, so permission-only
    authorization is insufficient for a raw class_id.
    """
    _, body = _function(
        ENHANCED_ROUTES,
        "get_class_exam_schedule",
    )

    service_call = (
        "EnhancedExamService."
        "get_class_exam_schedule"
    )

    service_index = body.find(service_call)

    assert service_index >= 0

    authorization_markers = (
        "_exam_allowed_class_ids",
        "_exam_is_authorized_for_user",
        "allowed_class_ids",
    )

    auth_indexes = [
        body.find(marker)
        for marker in authorization_markers
        if body.find(marker) >= 0
    ]

    assert auth_indexes, (
        "schedule route accepts raw class_id without "
        "tenant-effective class resource authorization"
    )

    assert min(auth_indexes) < service_index, (
        "schedule resource authorization must happen "
        "before schedule analysis"
    )


def test_batch_analytics_fails_closed_instead_of_partial_success():
    """
    Current behavior skips failed/unauthorized IDs and aggregates the rest.
    That creates partial-result/existence-oracle semantics.
    """
    _, body = _function(
        ENHANCED_ROUTES,
        "get_batch_exam_analytics",
    )

    assert "for exam_id in exam_ids" in body

    partial_patterns = (
        'if "error" not in analytics',
        "if 'error' not in analytics",
    )

    assert not any(
        pattern in body
        for pattern in partial_patterns
    ), (
        "batch analytics silently omits failed IDs; "
        "batch authorization must fail closed"
    )


def test_performance_trends_does_not_start_from_unscoped_exam_query():
    """
    Exam ownership derives through Class. Materializing Exam.query before
    Class tenant/branch containment is not an acceptable boundary.
    """
    _, body = _function(
        ENHANCED_ROUTES,
        "get_performance_trends",
    )

    assert "query = Exam.query" not in body, (
        "performance trends starts from raw Exam.query"
    )


def test_performance_trends_joins_class_for_tenant_branch_scope():
    _, body = _function(
        ENHANCED_ROUTES,
        "get_performance_trends",
    )

    assert (
        ".join(Class" in body
        or ".join(\n" in body and "Class" in body
    ), (
        "performance trends must derive Exam ownership "
        "through Class"
    )

    assert "Class.tenant_id" in body

    # Branch is optional request context, but the route/query must
    # understand branch ownership before activation.
    assert "Class.branch_id" in body


def test_performance_trends_supports_allowed_class_projection():
    """
    If a class-restricted role ever receives the route permission,
    trends must be projected at query level rather than post-filtered.
    """
    _, body = _function(
        ENHANCED_ROUTES,
        "get_performance_trends",
    )

    assert (
        "allowed_class_ids" in body
        or "_exam_allowed_class_ids" in body
    ), (
        "performance trends has no tenant-effective "
        "allowed-class projection"
    )


def test_analytics_route_handles_scoped_service_denial_without_none_crash():
    """
    EnhancedExamService.get_exam_analytics may deny an out-of-scope exam.
    Route code must not assume a mapping before checking the result.
    """
    _, body = _function(
        ENHANCED_ROUTES,
        "get_exam_analytics",
    )

    unsafe = (
        'if "error" in analytics'
        in body
        and "if analytics is None" not in body
        and "if not analytics" not in body
    )

    assert not unsafe, (
        "analytics route assumes service result is iterable; "
        "scoped denial can become a 500 path"
    )


def test_batch_analytics_handles_scoped_service_denial_without_none_crash():
    _, body = _function(
        ENHANCED_ROUTES,
        "get_batch_exam_analytics",
    )

    unsafe = (
        '"error" not in analytics' in body
        and "analytics is None" not in body
        and "not analytics" not in body
    )

    assert not unsafe, (
        "batch analytics assumes every service result "
        "is an iterable mapping"
    )
