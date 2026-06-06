import pages from "../content/pages.json";

const COURSE_PAGE_ORDER = ["syllabus", "lectures", "recitation", "assignments", "projects", "links", "videos", "tirgul"];

export const currentCourseLinks = [
  {
    name: "DS-NS 2025",
    href: "/ds-ns-2025/",
    label: "27-5021 Data Science applications in Neuroscience- Graduate seminar",
  },
  {
    name: "BS-CS 2025",
    href: "/bs-cs-2025/",
    label: "27-405 Computational neuroscience seminar - Undergraduate seminar",
  },
  {
    name: "SDA 2025",
    href: "/sda-2025/",
    label: "27-505 Data and signal analysis in neuroscience - Graduate course",
  },
];

export const pastCourseLines = [
  "27-5021 Data Science applications in Neuroscience 2021-24",
  "27-505 Data and signal analysis in Neuroscience - 2005-24",
  "27-521 Scientific programming using MATLAB - 2005-12",
  "27-541 Advanced Data and signal analysis in Neuroscience - 2007",
  "27-532 Advanced topics in Basal Ganglia research - 2006/7, 2008/9, 2011/12, 2014/15, 2020/21",
  "27-551 Neurophysiological basis of neural disorders - 2009/10, 2012/13, 2015/16, 2021/22",
];

function pageTypeFor(title, courseName) {
  const rawType = title.replace(courseName, "").trim();
  return rawType ? rawType[0].toUpperCase() + rawType.slice(1) : "Course page";
}

function courseSlugFor(courseName) {
  return courseName.toLowerCase().replace(/\s+/g, "-");
}

export function getCourses() {
  const coursePages = pages
    .filter((page) => {
      const title = page.title ?? "";
      const path = page.targetPath ?? "";
      return page.section === "Courses" || page.section === "SDA 2025" || /matlab 2018/i.test(title) || /^(\/assignments2018\/|\/tirgul2018\/)$/.test(path);
    })
    .map((page) => {
      const title = page.title ?? "";
      const courseName = title.match(/^(SDA|MATLAB)\s+(20\d{2})/i)?.[0]?.replace(/\bSda\b/i, "SDA") ?? title;
      const type = pageTypeFor(title, courseName);
      const order = COURSE_PAGE_ORDER.findIndex((item) => type.toLowerCase().includes(item));

      return {
        href: page.targetPath,
        title,
        courseName,
        slug: courseSlugFor(courseName),
        type,
        order: order === -1 ? 99 : order,
      };
    });

  const coursesByName = coursePages.reduce((groups, page) => {
    const existing = groups.get(page.courseName) ?? {
      name: page.courseName,
      slug: page.slug,
      href: `/${page.slug}/`,
      pages: [],
    };

    existing.pages.push(page);
    groups.set(page.courseName, existing);
    return groups;
  }, new Map());

  const migratedCourses = [...coursesByName.values()]
    .map((course) => ({
      ...course,
      pages: course.pages.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title)),
    }))
    .sort((a, b) => {
      const aYear = Number(a.name.match(/\b(20\d{2})\b/)?.[1] ?? 0);
      const bYear = Number(b.name.match(/\b(20\d{2})\b/)?.[1] ?? 0);
      return bYear - aYear || a.name.localeCompare(b.name);
    });

  const currentShells = currentCourseLinks.map((course) => ({
    ...course,
    slug: course.href.replace(/^\/|\/$/g, ""),
    pages: course.name === "SDA 2025"
      ? [
          ...(migratedCourses.find((migrated) => migrated.name === course.name)?.pages ?? []),
          {
            href: "/sda-2025-videos/",
            title: "SDA 2025 videos",
            courseName: "SDA 2025",
            slug: "sda-2025",
            type: "Videos",
            order: 6,
          },
        ].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
      : migratedCourses.find((migrated) => migrated.name === course.name)?.pages ?? [],
  }));

  const currentNames = new Set(currentShells.map((course) => course.name));
  return [
    ...currentShells,
    ...migratedCourses.filter((course) => !currentNames.has(course.name)),
  ];
}
