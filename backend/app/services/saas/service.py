from . import tenant_ops, billing_ops
from .serialization import serialize_tenant, serialize_invoice, serialize_payment


class SaaSService:
    create_tenant = staticmethod(tenant_ops.create_tenant)
    get_user_tenants = staticmethod(tenant_ops.get_user_tenants)
    get_tenant_for_user = staticmethod(tenant_ops.get_tenant_for_user)
    update_tenant = staticmethod(tenant_ops.update_tenant)
    list_members = staticmethod(tenant_ops.list_members)
    create_invitation = staticmethod(tenant_ops.create_invitation)
    accept_invitation = staticmethod(tenant_ops.accept_invitation)

    platform_list_members = staticmethod(tenant_ops.platform_list_members)
    platform_upsert_member = staticmethod(tenant_ops.platform_upsert_member)
    platform_update_membership = staticmethod(tenant_ops.platform_update_membership)
    platform_delete_membership = staticmethod(tenant_ops.platform_delete_membership)

    list_invoices = staticmethod(billing_ops.list_invoices)
    create_invoice = staticmethod(billing_ops.create_invoice)
    record_payment = staticmethod(billing_ops.record_payment)
    list_payments = staticmethod(billing_ops.list_payments)
    platform_list_tenants = staticmethod(billing_ops.platform_list_tenants)
    platform_list_tenants_filtered = staticmethod(billing_ops.platform_list_tenants_filtered)
    platform_get_tenant_detail = staticmethod(billing_ops.platform_get_tenant_detail)
    platform_kpis = staticmethod(billing_ops.platform_kpis)
    platform_update_tenant = staticmethod(billing_ops.platform_update_tenant)
    platform_financial_summary = staticmethod(billing_ops.platform_financial_summary)
    platform_list_invoices = staticmethod(billing_ops.platform_list_invoices)
    platform_list_payments = staticmethod(billing_ops.platform_list_payments)

    serialize_tenant = staticmethod(serialize_tenant)
    serialize_invoice = staticmethod(serialize_invoice)
    serialize_payment = staticmethod(serialize_payment)
