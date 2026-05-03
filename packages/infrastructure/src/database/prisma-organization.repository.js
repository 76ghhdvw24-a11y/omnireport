"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaOrganizationRepository = void 0;
class PrismaOrganizationRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findById(id) {
        return this.prisma.organization.findUnique({ where: { id } });
    }
    async findBySlug(slug) {
        return this.prisma.organization.findUnique({ where: { slug } });
    }
    async create(data) {
        return this.prisma.organization.create({
            data: {
                name: data.name,
                slug: data.slug,
                logoUrl: data.logoUrl || null,
            },
        });
    }
}
exports.PrismaOrganizationRepository = PrismaOrganizationRepository;
//# sourceMappingURL=prisma-organization.repository.js.map