import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { UpdateEmployeeDto } from "./dto/update-employee.dto";
import { AuditService } from "../audit/audit.service";
import { AuthUser } from "../auth/current-user.decorator";

@Injectable()
export class EmployeesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(params: {
    search?: string;
    departmentId?: number;
    status?: string;
    page?: number;
  }) {
    const take = 24;
    const page = params.page ?? 1;
    const where = {
      AND: [
        params.search
          ? {
              OR: [
                { name: { contains: params.search } },
                { email: { contains: params.search } },
                { employeeCode: { contains: params.search } },
              ],
            }
          : {},
        params.departmentId ? { departmentId: params.departmentId } : {},
        params.status ? { status: params.status as any } : {},
      ],
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.employee.findMany({
        where,
        include: {
          department: true,
          location: true,
          assignments: {
            where: { status: "ACTIVE" },
            include: { asset: { include: { category: true } } },
          },
        },
        orderBy: { name: "asc" },
        take,
        skip: (page - 1) * take,
      }),
      this.prisma.employee.count({ where }),
    ]);

    return { items, total, page, pageSize: take };
  }

  async findOne(id: number) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        location: true,
        manager: true,
        assignments: {
          where: { status: "ACTIVE" },
          include: { asset: { include: { category: true, license: true } } },
        },
      },
    });
    if (!employee) throw new NotFoundException("Employee not found.");
    return employee;
  }

  async create(dto: CreateEmployeeDto, actor: AuthUser) {
    const employee = await this.prisma.employee.create({
      data: {
        ...dto,
        joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : undefined,
      },
    });
    await this.audit.log({
      userId: actor.id,
      action: "EMPLOYEE_CREATED",
      entity: "Employee",
      entityId: employee.id,
    });
    return employee;
  }

  async update(id: number, dto: UpdateEmployeeDto, actor: AuthUser) {
    await this.findOne(id);
    const employee = await this.prisma.employee.update({
      where: { id },
      data: {
        ...dto,
        joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : undefined,
      },
    });
    await this.audit.log({
      userId: actor.id,
      action: "EMPLOYEE_EDITED",
      entity: "Employee",
      entityId: employee.id,
      metadata: dto as any,
    });
    return employee;
  }

  async remove(id: number, actor: AuthUser) {
    await this.findOne(id);
    await this.prisma.employee.update({
      where: { id },
      data: { status: "EXITED" },
    });
    await this.audit.log({
      userId: actor.id,
      action: "EMPLOYEE_EXITED",
      entity: "Employee",
      entityId: id,
    });
    return { success: true };
  }
}
