"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/contexts/AdminContext";
import { useNotification } from "@/contexts/NotificationContext";
import { Story, StoryPage, StoryQuizQuestion, STORY_THEMES, STORY_TAGS } from "@/types/story";
import { JLPTLevel, JLPT_LEVELS } from "@/types/kanji";
import { storyManager } from "@/utils/storyManager";
import { marked } from "marked";

export default function EditStoryPage() {
    const router = useRouter();
    const params = useParams();
    const { user } = useAuth();
    const { isAdmin, loading: adminLoading } = useAdmin();
    const { showNotification } = useNotification();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [story, setStory] = useState<Story | null>(null);
    const [formData, setFormData] = useState<any>(null);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [tagInput, setTagInput] = useState("");
    const [quizInput, setQuizInput] = useState({
        question: "",
        options: ["", "", "", ""],
        correctIndex: 0,
        explanation: ""
    });

    // Fetch story on mount
    useEffect(() => {
        if (!params?.id) return;
        const fetchStory = async () => {
            setLoading(true);
            try {
                const s = await storyManager.getStory(params.id as string);
                if (!s) {
                    showNotification({ title: "Not Found", message: "Story not found.", type: "error" });
                    router.push("/admin/stories");
                    return;
                }
                setStory(s);
                setFormData({ ...s });
            } catch (e) {
                showNotification({ title: "Error", message: "Failed to load story.", type: "error" });
                router.push("/admin/stories");
            } finally {
                setLoading(false);
            }
        };
        fetchStory();
    }, [params?.id]);

    // Admin guard
    useEffect(() => {
        if (!adminLoading && !isAdmin) {
            router.push("/");
        }
    }, [isAdmin, adminLoading, router]);

    const handleInputChange = (field: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [field]: value }));
    };

    const updatePage = (index: number, field: keyof StoryPage, value: string) => {
        const newPages = [...formData.pages];
        newPages[index] = { ...newPages[index], [field]: value };
        setFormData((prev: any) => ({ ...prev, pages: newPages }));
    };

    const addPage = () => {
        const newPage: StoryPage = {
            pageNumber: formData.pages.length + 1,
            imageUrl: "",
            imageAlt: "",
            text: "",
            translation: ""
        };
        setFormData((prev: any) => ({ ...prev, pages: [...prev.pages, newPage] }));
        setCurrentPageIndex(formData.pages.length);
    };

    const removePage = (index: number) => {
        if (formData.pages.length === 1) return;
        const newPages = formData.pages.filter((_: any, i: number) => i !== index);
        newPages.forEach((page: any, i: number) => { page.pageNumber = i + 1; });
        setFormData((prev: any) => ({ ...prev, pages: newPages }));
        if (currentPageIndex >= newPages.length) setCurrentPageIndex(newPages.length - 1);
    };

    const addTag = () => {
        if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
            setFormData((prev: any) => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
            setTagInput("");
        }
    };

    const removeTag = (tagToRemove: string) => {
        setFormData((prev: any) => ({ ...prev, tags: prev.tags.filter((tag: string) => tag !== tagToRemove) }));
    };

    const addQuizQuestion = () => {
        if (!quizInput.question.trim()) return;
        if (quizInput.options.some((opt) => !opt.trim())) return;
        const newQuestion: StoryQuizQuestion = {
            id: `q${formData.quiz.length + 1}`,
            ...quizInput
        };
        setFormData((prev: any) => ({ ...prev, quiz: [...prev.quiz, newQuestion] }));
        setQuizInput({ question: "", options: ["", "", "", ""], correctIndex: 0, explanation: "" });
    };

    const removeQuizQuestion = (index: number) => {
        setFormData((prev: any) => ({ ...prev, quiz: prev.quiz.filter((_: any, i: number) => i !== index) }));
    };

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, pageIndex?: number) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;
        if (!file.type.startsWith("image/")) return;
        if (file.size > 5 * 1024 * 1024) return;
        try {
            setUploadingImage(true);
            const token = await user.getIdToken();
            const uploadFormData = new FormData();
            uploadFormData.append("file", file);
            const response = await fetch("/api/admin/upload", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: uploadFormData
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Upload failed");
            if (pageIndex !== undefined) {
                updatePage(pageIndex, "imageUrl", data.url);
            } else {
                handleInputChange("coverImageUrl", data.url);
            }
            if (fileInputRef.current) fileInputRef.current.value = "";
        } catch (error: any) {
            showNotification({ title: "Upload Failed", message: error.message, type: "error" });
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSave = async (publish: boolean = false) => {
        if (!user || !isAdmin) return;
        setSaving(true);
        try {
            // Validation
            if (!formData.title.trim() || !formData.titleJa.trim()) {
                showNotification({ title: "Missing Information", message: "Please enter both English and Japanese titles.", type: "warning" });
                setSaving(false); return;
            }
            if (formData.pages.some((page: any) => !page.text.trim() || !page.translation.trim())) {
                showNotification({ title: "Incomplete Pages", message: "All pages must have both Japanese text and English translation.", type: "warning" });
                setSaving(false); return;
            }
            // If publishing, require publishedAt
            let status = publish ? "published" : formData.status;
            let publishedAt = publish ? (formData.publishedAt ? new Date(formData.publishedAt) : new Date()) : (formData.publishedAt ? new Date(formData.publishedAt) : undefined);
            if (publish && !publishedAt) {
                showNotification({ title: "Missing Publish Date", message: "Please select a publish date.", type: "warning" });
                setSaving(false); return;
            }
            const storyData = {
                ...formData,
                status,
                publishedAt,
                authorId: user.uid,
                viewCount: formData.viewCount || 0,
                completionCount: formData.completionCount || 0,
            };
            await storyManager.saveStory(storyData);
            showNotification({ title: "Success!", message: publish ? "Story published!" : "Story saved!", type: "success" });
            router.push("/admin/stories");
        } catch (error: any) {
            showNotification({ title: "Failed to Save", message: error.message || "Please try again.", type: "error" });
        } finally {
            setSaving(false);
        }
    };

    if (adminLoading || !isAdmin || loading || !formData) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    const currentPage = formData.pages[currentPageIndex];

    return (
        <>
            {/* Top Gradient Section */}
            <div className="relative w-full h-[16.67vh] min-h-[120px] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/25 to-secondary/20" />
                <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-background to-transparent" />
            </div>
            {/* Main Content */}
            <div className="container mx-auto px-4 py-8 min-h-screen">
                <div className="max-w-6xl mx-auto space-y-6 mt-8 mb-8">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => router.push('/admin/stories')}
                                className="mr-2 p-2 rounded-full hover:bg-muted transition-colors"
                                title="Back to Stories List"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <h1 className="text-3xl font-bold text-foreground">Edit Story</h1>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => router.push("/admin/stories")} className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/90">Back</button>
                        </div>
                    </div>
                    <form onSubmit={e => { e.preventDefault(); handleSave(false); }} className="space-y-8">
                        {/* Title, JLPT, Theme, Slug */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Title (EN)</label>
                                <input type="text" value={formData.title} onChange={e => handleInputChange("title", e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Title (JA)</label>
                                <input type="text" value={formData.titleJa} onChange={e => handleInputChange("titleJa", e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">URL Slug</label>
                                <input type="text" value={formData.slug} onChange={e => handleInputChange("slug", e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">JLPT Level</label>
                                <select value={formData.jlptLevel} onChange={e => handleInputChange("jlptLevel", e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground">
                                    {JLPT_LEVELS.map((level) => (<option key={level} value={level}>{level}</option>))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Theme</label>
                                <select value={formData.theme} onChange={e => handleInputChange("theme", e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground">
                                    {STORY_THEMES.map((theme) => (<option key={theme} value={theme}>{theme}</option>))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Description</label>
                                <textarea value={formData.description} onChange={e => handleInputChange("description", e.target.value)} rows={2} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground" />
                            </div>
                        </div>
                        {/* Cover Image */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Cover Image</label>
                            <input ref={fileInputRef} type="file" accept="image/*" onChange={e => handleImageUpload(e)} className="hidden" id="cover-image-upload" />
                            <label htmlFor="cover-image-upload" className={`inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 cursor-pointer ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}>{uploadingImage ? 'Uploading...' : 'Upload Cover Image'}</label>
                            {formData.coverImageUrl && (<div className="mt-2"><img src={formData.coverImageUrl} alt="Cover" className="max-w-xs rounded-lg border border-border" /></div>)}
                        </div>
                        {/* Pages Overview */}
                        <div className="bg-card rounded-lg p-6 border border-border">
                            <h2 className="text-xl font-semibold mb-4">Pages Overview</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mb-6">
                                {formData.pages.map((page: any, index: number) => (
                                    <div key={index} onClick={() => setCurrentPageIndex(index)} className={`p-3 rounded-lg border cursor-pointer transition-all ${currentPageIndex === index ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
                                        <div className="text-center">
                                            <div className="text-3xl mb-1">{page.imageUrl ? '📷' : '🖼️'}</div>
                                            <p className="text-sm font-medium">Page {index + 1}</p>
                                            <p className="text-xs text-muted-foreground mt-1">{page.imageUrl ? 'Image added' : 'No image'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="text-sm text-muted-foreground">{formData.pages.filter((p: any) => p.imageUrl).length} of {formData.pages.length} pages have images</div>
                        </div>
                        {/* Pages */}
                        <div className="bg-card rounded-lg p-6 border border-border">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold">Story Pages ({formData.pages.length})</h2>
                                <div className="flex gap-2">
                                    {formData.pages.length < 20 && (<button type="button" onClick={addPage} className="px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90">Add Page</button>)}
                                </div>
                            </div>
                            <div className="flex gap-2 mb-4 overflow-x-auto">
                                {formData.pages.map((page: any, index: number) => (
                                    <button key={index} type="button" onClick={() => setCurrentPageIndex(index)} className={`px-4 py-2 rounded-lg flex items-center gap-2 ${currentPageIndex === index ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'}`}><span>Page {index + 1}</span>{page.imageUrl ? (<span className="text-xs">📷</span>) : (<span className="text-xs opacity-50">🖼️</span>)}</button>
                                ))}
                            </div>
                            {/* Current Page Editor */}
                            <div className="space-y-4">
                                <div className="bg-muted/20 rounded-lg p-4">
                                    <label className="block text-sm font-medium mb-2">Page {currentPage.pageNumber} Image</label>
                                    {currentPage.imageUrl ? (<div className="space-y-3"><div className="relative inline-block"><img src={currentPage.imageUrl} alt={currentPage.imageAlt || `Page ${currentPage.pageNumber}`} className="max-w-md rounded-lg border border-border" /><button type="button" onClick={() => updatePage(currentPageIndex, 'imageUrl', '')} className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 shadow-lg" title="Remove image">✕</button></div><div><label className="block text-xs font-medium mb-1">Image Alt Text (for accessibility)</label><input type="text" value={currentPage.imageAlt} onChange={e => updatePage(currentPageIndex, 'imageAlt', e.target.value)} className="w-full max-w-md px-3 py-1 text-sm border border-border rounded bg-background" placeholder="Describe the image for screen readers" /></div></div>) : (<div><input ref={fileInputRef} type="file" accept="image/*" onChange={e => handleImageUpload(e, currentPageIndex)} className="hidden" id={`page-image-upload-${currentPageIndex}`} /><label htmlFor={`page-image-upload-${currentPageIndex}`} className={`inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 cursor-pointer ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}>{uploadingImage ? 'Uploading...' : 'Upload Image'}</label></div>)}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Japanese Text *</label>
                                    <textarea value={currentPage.text} onChange={e => updatePage(currentPageIndex, 'text', e.target.value)} rows={4} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground" placeholder="むかしむかし、あるところに..." />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">English Translation *</label>
                                    <textarea value={currentPage.translation} onChange={e => updatePage(currentPageIndex, 'translation', e.target.value)} rows={4} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground" placeholder="Once upon a time, in a certain place..." />
                                </div>
                                {formData.pages.length > 1 && (<button type="button" onClick={() => removePage(currentPageIndex)} className="px-3 py-1 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90">Remove This Page</button>)}
                            </div>
                        </div>
                        {/* Quiz */}
                        <div className="bg-card rounded-lg p-6 border border-border space-y-4">
                            <h2 className="text-xl font-semibold">Quiz Questions</h2>
                            <div className="space-y-2">
                                {formData.quiz.map((q: any, idx: number) => (
                                    <div key={q.id} className="border rounded-lg p-3 mb-2">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-medium">Q{idx + 1}: {q.question}</span>
                                            <button type="button" onClick={() => removeQuizQuestion(idx)} className="text-red-500 hover:underline">Remove</button>
                                        </div>
                                        <ul className="list-decimal ml-6 mb-2">
                                            {q.options.map((opt: string, i: number) => (
                                                <li key={i} className={i === q.correctIndex ? "font-bold text-green-600" : ""}>{opt}</li>
                                            ))}
                                        </ul>
                                        {q.explanation && (<div className="text-xs text-muted-foreground">{q.explanation}</div>)}
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-2">
                                <input type="text" value={quizInput.question} onChange={e => setQuizInput({ ...quizInput, question: e.target.value })} placeholder="Question" className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground" />
                                <div className="grid grid-cols-2 gap-2">
                                    {quizInput.options.map((opt, i) => (
                                        <input key={i} type="text" value={opt} onChange={e => setQuizInput({ ...quizInput, options: quizInput.options.map((o, idx) => idx === i ? e.target.value : o) })} placeholder={`Option ${i + 1}`} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground" />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
