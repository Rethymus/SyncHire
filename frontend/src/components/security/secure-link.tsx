/**
 * 安全的外部链接组件
 * 自动添加安全属性 (target, rel)
 */

"use client";

import { forwardRef, ComponentPropsWithoutRef } from "react";
import Link from "next/link";

interface SecureLinkProps extends ComponentPropsWithoutRef<"a"> {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}

/**
 * 安全的外部链接组件
 * 自动添加 noopener noreferrer 防止 tabnabbing 攻击
 */
export const SecureLink = forwardRef<HTMLAnchorElement, SecureLinkProps>(
  ({ href, children, external = true, ...props }, ref) => {
    const isExternal = external && (href.startsWith("http") || href.startsWith("//"));

    if (isExternal) {
      return (
        <a
          ref={ref}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          {...props}
        >
          {children}
        </a>
      );
    }

    return (
      <Link href={href} ref={ref as any} {...props}>
        {children}
      </Link>
    );
  }
);

SecureLink.displayName = "SecureLink";

/**
 * 安全的Next.js Link包装器
 * 自动检测外部链接并应用适当的安全属性
 */
export const SecureNextLink = forwardRef<HTMLAnchorElement, SecureLinkProps>(
  ({ href, children, external, ...props }, ref) => {
    const isExternal = external && (href.startsWith("http") || href.startsWith("//"));

    if (isExternal) {
      return (
        <a
          ref={ref}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          {...props}
        >
          {children}
        </a>
      );
    }

    return (
      <Link href={href} {...props}>
        {children}
      </Link>
    );
  }
);

SecureNextLink.displayName = "SecureNextLink";
