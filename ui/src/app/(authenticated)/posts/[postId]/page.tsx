import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostDetailView } from "@/core/components/other/posts/post-detail-view";
import { getPostServer } from "@/api/post/post.server";
import { resolveLocaleFromParams } from "@/i18n/server";
import { seoCopy } from "@/core/seo/copy";
import { buildNotFoundMetadata, buildPageMetadata } from "@/core/seo/metadata";
import { JsonLd, socialPostJsonLd } from "@/core/seo/json-ld";
import { displayNameOf, toPlainPostText, truncate } from "@/core/seo/text";
import type { Post } from "@/models/post/post.model";

/**
 * Gonderi detayi: herkese acik gonderi sunucuda cekilir. Erisilemeyen gonderi 404 doner
 * (403 varligini sizdirirdi), o yuzden burada da 404 = bulunamadi.
 */
type Props = { params: Promise<{ postId: string; locale?: string }> };

const loadPost = async (postId: string) => {
    const id = Number(postId);
    return Number.isFinite(id) && id > 0 ? getPostServer(id) : { data: null, status: 404 };
};

/** Bos icerikli yeniden paylasimda kaynak gonderinin metni kullanilir. */
const postText = (post: Post) => toPlainPostText(post.content, post.mentions) || (post.repostOf ? toPlainPostText(post.repostOf.content, post.repostOf.mentions) : "");

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { postId } = await params;
    const locale = await resolveLocaleFromParams(params);
    const { data: post, status } = await loadPost(postId);

    if (!post) {
        if (status === 404) {
            // generateMetadata icinde notFound(): govde akisa girmeden once atilir, yanit GERCEK 404 olur.
            // Sayfa govdesinde atilsaydi (authenticated)/loading.tsx kabugu 200 ile coktan gonderilmis olurdu (soft 404).
            notFound();
        }
        return status === 0 || status >= 500
            ? { title: seoCopy(locale, "siteTitle") }
            : buildNotFoundMetadata(seoCopy(locale, "postNotFoundTitle"), seoCopy(locale, "postNotFoundDescription"));
    }

    const author = displayNameOf(post.author);
    const text = postText(post);
    const image = post.images[0]?.url ?? post.repostOf?.images[0]?.url ?? null;

    return buildPageMetadata({
        locale,
        path: `/posts/${post.id}`,
        title: text ? seoCopy(locale, "postTitle", { author, excerpt: truncate(text, 70) }) : author,
        description: text ? truncate(text, 160) : seoCopy(locale, "postDescription", { author }),
        image: image ? { url: image, alt: author } : null,
        type: "article",
        publishedTime: post.createdAt,
    });
}

export default async function Page({ params }: Props) {
    const { postId } = await params;
    const locale = await resolveLocaleFromParams(params);
    const { data: post, status } = await loadPost(postId);

    if (status === 404) {
        notFound();
    }

    return (
        <>
            {post ? <JsonLd data={socialPostJsonLd(post, locale)} /> : null}
            <PostDetailView initialPost={post} />
        </>
    );
}
