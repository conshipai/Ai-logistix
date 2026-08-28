import { PageHeader } from '@/components/app/shell'
import { OrganizationForms } from '@/components/app/organization-forms'
import { Badge, Card, CardBody, CardHeader, CardTitle, Table, Td, Th } from '@/components/ui'
import { countryName } from '@/lib/countries'
import { requireActor } from '@/lib/session'
import { formatDate, humanizeEnum } from '@/lib/utils'
import { getOrganization } from '@/server/services/organizations'
import { listOrganizationDocuments } from '@/server/services/documents'
import { OrganizationDocuments } from '@/components/app/organization-documents'

export const metadata = { title: 'My organization' }
export const dynamic = 'force-dynamic'

export default async function OrganizationPage() {
  const actor = await requireActor()
  const [organization, documents] = await Promise.all([
    getOrganization(actor),
    listOrganizationDocuments(actor),
  ])

  const isSupplier = organization.type === 'SUPPLIER'

  return (
    <>
      <PageHeader
        eyebrow={humanizeEnum(organization.type)}
        title={organization.tradingName ?? organization.legalName}
        description="Your company details, capability profile, people and compliance documents."
        actions={
          <div className="flex flex-wrap gap-2">
            <Badge tone={organization.accountStatus === 'ACTIVE' ? 'positive' : 'caution'}>
              {humanizeEnum(organization.accountStatus)}
            </Badge>
            <Badge tone={organization.kycStatus === 'VERIFIED' ? 'positive' : 'neutral'}>
              KYC: {humanizeEnum(organization.kycStatus)}
            </Badge>
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          <OrganizationForms
            organization={{
              id: organization.id,
              legalName: organization.legalName,
              tradingName: organization.tradingName,
              country: organization.country,
              registrationNumber: organization.registrationNumber,
              taxId: organization.taxId,
              addressLine1: organization.addressLine1,
              addressLine2: organization.addressLine2,
              city: organization.city,
              stateProvince: organization.stateProvince,
              postalCode: organization.postalCode,
              website: organization.website,
              primaryContactName: organization.primaryContactName,
              primaryContactEmail: organization.primaryContactEmail,
              phone: organization.phone,
              email: organization.email,
              incorporationDate: organization.incorporationDate,
              industry: organization.industry,
              employeeCount: organization.employeeCount,
              annualRevenueRange: organization.annualRevenueRange,
              ownershipDescription: organization.ownershipDescription,
              localContentClass: organization.localContentClass,
              preferredCurrency: organization.preferredCurrency,
            }}
            supplierProfile={
              isSupplier
                ? {
                    capabilities: organization.supplierProfile?.capabilities ?? null,
                    certifications: organization.supplierProfile?.certifications ?? null,
                    qualityCertifications:
                      organization.supplierProfile?.qualityCertifications ?? null,
                    healthSafetyCertifications:
                      organization.supplierProfile?.healthSafetyCertifications ?? null,
                    equipment: organization.supplierProfile?.equipment ?? null,
                    facilities: organization.supplierProfile?.facilities ?? null,
                    projectExperience: organization.supplierProfile?.projectExperience ?? null,
                    customerReferences: organization.supplierProfile?.customerReferences ?? null,
                    maximumContractCapacity:
                      organization.supplierProfile?.maximumContractCapacity ?? null,
                    maximumContractCurrency:
                      organization.supplierProfile?.maximumContractCurrency ?? 'USD',
                    typicalWorkingCapitalNeed:
                      organization.supplierProfile?.typicalWorkingCapitalNeed ?? null,
                    hasUsdAccess: organization.supplierProfile?.hasUsdAccess ?? false,
                    hasExistingCreditFacilities:
                      organization.supplierProfile?.hasExistingCreditFacilities ?? false,
                    currentLenders: organization.supplierProfile?.currentLenders ?? null,
                    insuranceDescription:
                      organization.supplierProfile?.insuranceDescription ?? null,
                  }
                : null
            }
            bankingRelationships={organization.bankingRelationships.map((relationship) => ({
              id: relationship.id,
              institutionName: relationship.institutionName,
              branch: relationship.branch,
              accountCurrency: relationship.accountCurrency,
              maskedAccountIdentifier: relationship.maskedAccountIdentifier,
              relationshipManagerName: relationship.relationshipManagerName,
            }))}
            canManageUsers
          />

          <OrganizationDocuments
            documents={documents.map((document) => ({
              id: document.id,
              fileName: document.fileName,
              category: document.category,
              sizeBytes: document.sizeBytes,
              createdAt: document.createdAt,
              expiresAt: document.expiresAt,
              uploadedBy: document.uploadedBy.name,
            }))}
          />
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Registered details</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 p-5 text-[13.5px]">
              <Row label="Reference" value={organization.reference} mono />
              <Row label="Type" value={humanizeEnum(organization.type)} />
              <Row label="Country" value={countryName(organization.country)} />
              <Row label="Registration no." value={organization.registrationNumber ?? '—'} />
              <Row label="Tax ID" value={organization.taxId ?? '—'} />
              <Row label="Incorporated" value={formatDate(organization.incorporationDate)} />
              <Row
                label="Local content"
                value={humanizeEnum(organization.localContentClass)}
              />
              <Row label="Joined" value={formatDate(organization.createdAt)} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>People</CardTitle>
            </CardHeader>
            <Table>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Role</Th>
                  <Th>Last seen</Th>
                </tr>
              </thead>
              <tbody>
                {organization.memberships.map((membership) => (
                  <tr key={membership.id}>
                    <Td>
                      <p className="font-medium">{membership.user.name}</p>
                      <p className="text-[11.5px] text-ink-400">{membership.user.email}</p>
                    </Td>
                    <Td>
                      <Badge tone="neutral">{humanizeEnum(membership.role)}</Badge>
                    </Td>
                    <Td className="text-[12.5px] text-ink-500">
                      {formatDate(membership.user.lastLoginAt)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>
      </div>
    </>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-ink-500">{label}</span>
      <span className={`text-right font-medium text-ink-900 ${mono ? 'font-mono text-[12.5px]' : ''}`}>
        {value}
      </span>
    </div>
  )
}
