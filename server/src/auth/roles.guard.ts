import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

// Defines the roles that a given user role satisfies (inherits permissions of)
const ROLE_SATISFACTIONS: Record<string, string[]> = {
  SUPER_ADMIN: [
    'SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'SALES_MANAGER',
    'SALES_AGENT', 'PURCHASE_MANAGER', 'INVENTORY_MANAGER', 'ACCOUNTANT', 'CASHIER', 'EMPLOYEE'
  ],
  ADMIN: [
    'ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'SALES_MANAGER', 'SALES_AGENT',
    'PURCHASE_MANAGER', 'INVENTORY_MANAGER', 'ACCOUNTANT', 'CASHIER', 'EMPLOYEE'
  ],
  HR_MANAGER: ['HR_MANAGER', 'HR_EMPLOYEE', 'EMPLOYEE'],
  HR_EMPLOYEE: ['HR_EMPLOYEE', 'EMPLOYEE'],
  SALES_MANAGER: ['SALES_MANAGER', 'SALES_AGENT', 'CASHIER', 'EMPLOYEE'],
  SALES_AGENT: ['SALES_AGENT', 'CASHIER', 'EMPLOYEE'],
  PURCHASE_MANAGER: ['PURCHASE_MANAGER', 'EMPLOYEE'],
  INVENTORY_MANAGER: ['INVENTORY_MANAGER', 'EMPLOYEE'],
  ACCOUNTANT: ['ACCOUNTANT', 'EMPLOYEE'],
  CASHIER: ['CASHIER', 'EMPLOYEE'],
  EMPLOYEE: ['EMPLOYEE'],
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.role) {
      return false;
    }

    const userSatisfiedRoles = ROLE_SATISFACTIONS[user.role] || [];
    return requiredRoles.some((role) => userSatisfiedRoles.includes(role));
  }
}

