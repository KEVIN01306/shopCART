import type {
    Contact as PrismaContact,
    Website as PrismaWebsite,
    FormSubmission as PrismaFormSubmission,
    Form as PrismaForm,
} from "@prisma/client";
import type {
    ContactEntity,
    ContactStatus,
    ContactSubmissionSummary,
} from "../../domain/contact.entity.js";

type ContactSubmissionWithForm = PrismaFormSubmission & {
    form?: Pick<PrismaForm, "id" | "name" | "slug"> | null;
};

type PrismaContactWithRelations = PrismaContact & {
    website?: Pick<PrismaWebsite, "id" | "name" | "domain"> | null;
    submissions?: Array<ContactSubmissionWithForm>;
    _count?: {
        submissions?: number;
    };
};

export class ContactMapper {
    static toDomain(raw: PrismaContactWithRelations): ContactEntity {
        let tags: string[] | null = null;
        if (Array.isArray(raw.tags)) {
            tags = raw.tags as string[];
        }

        let customData: Record<string, any> | null = null;
        if (raw.customData && typeof raw.customData === "object" && !Array.isArray(raw.customData)) {
            customData = raw.customData as Record<string, any>;
        }

        let submissions: ContactSubmissionSummary[] | undefined = undefined;
        if (raw.submissions && Array.isArray(raw.submissions)) {
            submissions = raw.submissions.map((sub: ContactSubmissionWithForm) => ({
                id: sub.id,
                formId: sub.formId,
                formName: sub.form?.name,
                formSlug: sub.form?.slug,
                data: (sub.data && typeof sub.data === "object" ? sub.data : {}) as Record<string, any>,
                status: sub.status as "PENDING" | "PROCESSED" | "SPAM" | "FAILED",
                createdAt: sub.createdAt,
            }));
        }

        return {
            id: raw.id,
            websiteId: raw.websiteId,
            website: raw.website
                ? {
                      id: raw.website.id,
                      name: raw.website.name,
                      domain: raw.website.domain,
                  }
                : null,
            email: raw.email,
            firstName: raw.firstName,
            lastName: raw.lastName,
            phone: raw.phone,
            company: raw.company,
            status: raw.status as ContactStatus,
            customData,
            tags,
            submissionsCount: raw._count?.submissions,
            submissions,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
        };
    }
}
