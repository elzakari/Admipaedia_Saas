"""
V28-R13G activation contract.

These tests intentionally exercise the real API-v1 blueprint hierarchy.

Before controlled activation, the Candidate-A enhanced exam routes must
be absent. Once enhanced_exams_bp is deliberately registered under the
existing /exams namespace, this suite becomes GREEN.

Security/resource authorization remains covered by the R13B-R13F suites.
"""

from flask import Flask

from app.api.v1 import api_v1_bp


EXPECTED_ENHANCED_ROUTES = {
    (
        "POST",
        "/api/v1/exams/conflicts/check",
        "api_v1.exams.enhanced_exams.check_exam_conflicts",
    ),
    (
        "GET",
        "/api/v1/exams/<int:exam_id>/analytics",
        "api_v1.exams.enhanced_exams.get_exam_analytics",
    ),
    (
        "GET",
        "/api/v1/exams/classes/<int:class_id>/schedule",
        "api_v1.exams.enhanced_exams.get_class_exam_schedule",
    ),
    (
        "POST",
        "/api/v1/exams/duration/calculate",
        "api_v1.exams.enhanced_exams.calculate_optimal_duration",
    ),
    (
        "POST",
        "/api/v1/exams/batch-analytics",
        "api_v1.exams.enhanced_exams.get_batch_exam_analytics",
    ),
    (
        "GET",
        "/api/v1/exams/performance-trends",
        "api_v1.exams.enhanced_exams.get_performance_trends",
    ),
}


def _methods(rule):
    return {
        method
        for method in rule.methods
        if method not in {"HEAD", "OPTIONS"}
    }


def _build_api_app():
    app = Flask("r13g_activation_contract")

    app.register_blueprint(
        api_v1_bp,
        url_prefix="/api/v1",
    )

    return app


def _route_tuples(app):
    rows = set()

    for rule in app.url_map.iter_rules():
        for method in _methods(rule):
            rows.add(
                (
                    method,
                    str(rule),
                    rule.endpoint,
                )
            )

    return rows


def test_candidate_a_enhanced_exam_public_contract_is_registered():
    app = _build_api_app()

    actual = _route_tuples(app)

    missing = (
        EXPECTED_ENHANCED_ROUTES
        - actual
    )

    assert not missing, (
        "Candidate-A enhanced exam routes are not fully "
        "registered in the real API-v1 hierarchy. "
        f"Missing: {sorted(missing)}"
    )


def test_enhanced_exam_routes_are_not_exposed_under_enhanced_namespace():
    app = _build_api_app()

    unexpected = []

    for rule in app.url_map.iter_rules():
        path = str(rule)

        if path.startswith(
            "/api/v1/exams/enhanced/"
        ):
            unexpected.append(
                (
                    path,
                    rule.endpoint,
                )
            )

    assert not unexpected, (
        "Enhanced implementation namespace leaked into "
        f"public API: {unexpected}"
    )


def test_enhanced_exam_public_contract_has_no_method_path_collisions():
    app = _build_api_app()

    index = {}

    collisions = {}

    for rule in app.url_map.iter_rules():
        path = str(rule)

        for method in _methods(rule):
            key = (
                method,
                path,
            )

            if key in index:
                collisions.setdefault(
                    key,
                    [
                        index[key],
                    ],
                ).append(
                    rule.endpoint
                )
            else:
                index[key] = (
                    rule.endpoint
                )

    assert not collisions, (
        "Method+path collisions detected after "
        f"activation: {collisions}"
    )


def test_exactly_six_enhanced_exam_endpoints_are_public():
    app = _build_api_app()

    enhanced = set()

    for rule in app.url_map.iter_rules():
        if (
            rule.endpoint.startswith(
                "enhanced_exams."
            )
            or ".enhanced_exams."
            in rule.endpoint
        ):
            for method in _methods(rule):
                enhanced.add(
                    (
                        method,
                        str(rule),
                    )
                )

    expected = {
        (
            method,
            path,
        )
        for method, path, endpoint
        in EXPECTED_ENHANCED_ROUTES
    }

    assert enhanced == expected, (
        "Enhanced exam public surface differs from "
        "the approved Candidate-A contract. "
        f"Expected: {sorted(expected)}; "
        f"Actual: {sorted(enhanced)}"
    )
