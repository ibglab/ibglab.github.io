const protectedCourses = [
  {
    key: "ds-ns-2025",
    label: "DS-NS 2025",
    passwordHash: "2bb386037d2e1a8314072284eb99b801cbf826a106caaf7e820ab5ab3eb640a1",
    matches: (pathname) => pathname === "/ds-ns-2025" || pathname === "/ds-ns-2025/",
  },
  {
    key: "bs-cs-2025",
    label: "BS-CS 2025",
    passwordHash: "5a94be3c10eaff8d4a1bc4054b8fd4f3e6977e00d34362a566cb4328a7ea0f43",
    matches: (pathname) => pathname === "/bs-cs-2025" || pathname === "/bs-cs-2025/",
  },
  {
    key: "sda-2025",
    label: "SDA 2025",
    passwordHash: "47963c1ff15831407f429dafc61ba849d2a66d4fa369106494c9b96ec80da089",
    matches: (pathname) => (
      pathname === "/sda-2025"
      || pathname === "/sda-2025/"
      || pathname.startsWith("/sda-2025-")
    ),
  },
  {
    key: "blogs-2021",
    label: "Road trip blog",
    eyebrow: "Protected blog",
    prompt: "Enter the blog password to view these posts.",
    actionLabel: "Open blog",
    passwordHash: "7c28b3f6a56f6eb6f4d49819953262da97ee990c3b25514eee113fd1bebc8067",
    matches: (pathname) => (
      pathname === "/roadtrip2021-blog"
      || pathname === "/roadtrip2021-blog/"
      || pathname === "/roadtrip2021-map"
      || pathname === "/roadtrip2021-map/"
      || pathname.startsWith("/post/")
    ),
  },
];

export function protectedCourseForPath(pathname) {
  return protectedCourses.find((course) => course.matches(pathname));
}
