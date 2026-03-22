export const mockEvents = [
    {
        _id: "e1",
        title: "Weekend River Cleanup",
        ngoId: "n1",
        date: new Date(Date.now() + 86400000 * 2), // 2 days from now
        location: "Downtown River Park",
        required_skills: ["manual labor", "environment"],
        status: "open"
    },
    {
        _id: "e2",
        title: "Math Tutoring for Kids",
        ngoId: "n2",
        date: new Date(Date.now() + 86400000 * 5), // 5 days from now
        location: "Central Library",
        required_skills: ["teaching", "math", "education"],
        status: "open"
    },
    {
        _id: "e3",
        title: "Food Drive Volunteer",
        ngoId: "n3",
        date: new Date(Date.now() + 86400000 * 1), // tomorrow
        location: "Community Center",
        required_skills: ["logistics", "organizing"],
        status: "open"
    }
];

export const mockNGOs = [
    {
        _id: "n1",
        name: "Green Earth Coalition",
        description: "Dedicated to preserving local ecosystems.",
        location: "Downtown",
        contact_email: "contact@greenearth.org",
        categories: ["Environment", "Conservation"]
    },
    {
        _id: "n2",
        name: "Future Minds Tutors",
        description: "Providing free education to underprivileged children.",
        location: "City Center",
        contact_email: "hello@futureminds.org",
        categories: ["Education", "Youth"]
    },
    {
        _id: "n3",
        name: "Hope Meals",
        description: "Distributing food to those in need.",
        location: "Westside",
        contact_email: "help@hopemeals.org",
        categories: ["Food Security", "Community"]
    }
];
