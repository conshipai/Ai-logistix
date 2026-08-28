'use client'

import { createProjectAction } from '@/app/actions/organization'
import { ActionForm } from '@/components/app/forms'
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Field,
  Input,
  Select,
  Textarea,
} from '@/components/ui'
import { COUNTRY_OPTIONS, CURRENCIES } from '@/lib/countries'

export function ProjectForm({
  owners,
  epcs,
}: {
  owners: Array<{ id: string; label: string }>
  epcs: Array<{ id: string; label: string }>
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a project</CardTitle>
      </CardHeader>
      <CardBody className="p-6">
        <ActionForm
          action={createProjectAction}
          submitLabel="Create project"
          pendingLabel="Creating…"
          successMessage="Project created."
        >
          {(state) => (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Project name" htmlFor="projectName" required error={state.errors?.name}>
                <Input id="projectName" name="name" required maxLength={200} />
              </Field>
              <Field
                label="Project owner"
                htmlFor="projectOwnerId"
                required
                error={state.errors?.projectOwnerId}
              >
                <Select id="projectOwnerId" name="projectOwnerId" required defaultValue="">
                  <option value="" disabled>
                    Select the operator or owner
                  </option>
                  {owners.map((owner) => (
                    <option key={owner.id} value={owner.id}>
                      {owner.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="EPC contractor" htmlFor="epcId">
                <Select id="epcId" name="epcId" defaultValue="">
                  <option value="">None assigned</option>
                  {epcs.map((epc) => (
                    <option key={epc.id} value={epc.id}>
                      {epc.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Country" htmlFor="projectCountry" required error={state.errors?.country}>
                <Select id="projectCountry" name="country" required defaultValue="">
                  <option value="" disabled>
                    Select a country
                  </option>
                  {COUNTRY_OPTIONS.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Location" htmlFor="location">
                <Input id="location" name="location" maxLength={200} placeholder="e.g. Palma, Cabo Delgado" />
              </Field>
              <Field label="Sector" htmlFor="sector">
                <Input id="sector" name="sector" maxLength={120} placeholder="e.g. Oil and gas" />
              </Field>
              <Field label="Status" htmlFor="projectStatus" required>
                <Select id="projectStatus" name="status" defaultValue="ACTIVE">
                  <option value="PLANNED">Planned</option>
                  <option value="ACTIVE">Active</option>
                  <option value="ON_HOLD">On hold</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </Select>
              </Field>
              <Field label="Currency" htmlFor="projectCurrency" required>
                <Select id="projectCurrency" name="currency" defaultValue="USD">
                  {CURRENCIES.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.code} — {currency.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Start date" htmlFor="startDate">
                <Input id="startDate" name="startDate" type="date" />
              </Field>
              <Field label="Target completion" htmlFor="targetCompletionDate">
                <Input id="targetCompletionDate" name="targetCompletionDate" type="date" />
              </Field>
              <Field label="Local-content programme" htmlFor="localContentProgram">
                <Input id="localContentProgram" name="localContentProgram" maxLength={200} />
              </Field>
              <Field label="Primary contact" htmlFor="projectContact">
                <Input id="projectContact" name="primaryContactName" maxLength={120} />
              </Field>
              <Field label="Description" htmlFor="projectDescription" className="sm:col-span-2">
                <Textarea id="projectDescription" name="description" rows={3} maxLength={4000} />
              </Field>
            </div>
          )}
        </ActionForm>
      </CardBody>
    </Card>
  )
}
