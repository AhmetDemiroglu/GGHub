import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReviewDetailView } from "@/core/components/other/reviews/review-detail-view";
import { getReviewServer } from "@/api/review/review.server";
import { getMessages, translate } from "@/i18n";
import { resolveLocaleFromParams } from "@/i18n/server";
import { seoCopy } from "@/core/seo/copy";
import { buildNotFoundMetadata, buildPageMetadata } from "@/core/seo/metadata";
import { JsonLd, breadcrumbJsonLd, reviewJsonLd } from "@/core/seo/json-ld";
import { displayNameOf, truncate } from "@/core/seo/text";
import { getGameImageUrl } from "@/core/lib/get-image-url";

/** Kalici inceleme sayfasi: icerik sunucuda cekilir (anonim erisime acik uc). */
type Props = { params: Promise<{ reviewId: string; locale?: string }> };

const loadReview = async (reviewId: string) => {
    const id = Number(reviewId);
    return Number.isFinite(id) && id > 0 ? getReviewServer(id) : { data: null, status: 404 };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { reviewId } = await params;
    const locale = await resolveLocaleFromParams(params);
    const { data: review, status } = await loadReview(reviewId);

    if (!review) {
        if (status === 404) {
            // generateMetadata icinde notFound(): govde akisa girmeden once atilir, yanit GERCEK 404 olur.
            // Sayfa govdesinde atilsaydi (authenticated)/loading.tsx kabugu 200 ile coktan gonderilmis olurdu (soft 404).
            notFound();
        }
        return status === 0 || status >= 500
            ? { title: seoCopy(locale, "siteTitle") }
            : buildNotFoundMetadata(seoCopy(locale, "reviewNotFoundTitle"), seoCopy(locale, "reviewNotFoundDescription"));
    }

    const image = getGameImageUrl(review.game?.backgroundImage ?? review.game?.coverImage, 1280);

    return buildPageMetadata({
        locale,
        path: `/reviews/${review.id}`,
        title: seoCopy(locale, "reviewTitle", { game: review.game?.name ?? "", author: displayNameOf(review.user), rating: review.rating }),
        description: truncate(review.content, 160),
        image: image ? { url: image, alt: review.game?.name ?? "" } : null,
        type: "article",
        publishedTime: review.createdAt,
    });
}

export default async function Page({ params }: Props) {
    const { reviewId } = await params;
    const locale = await resolveLocaleFromParams(params);
    const { data: review, status } = await loadReview(reviewId);

    if (status === 404) {
        notFound();
    }

    const messages = getMessages(locale);

    return (
        <>
            {review ? (
                <JsonLd
                    data={[
                        reviewJsonLd(review, locale),
                        breadcrumbJsonLd(locale, [
                            { name: translate(messages, "nav.home"), path: "/" },
                            ...(review.game ? [{ name: review.game.name, path: `/games/${review.game.slug || review.game.rawgId}` }] : []),
                            { name: translate(messages, "reviewDetail.reviewOf", { game: review.game?.name ?? "" }), path: `/reviews/${review.id}` },
                        ]),
                    ]}
                />
            ) : null}
            <ReviewDetailView initialReview={review} />
        </>
    );
}
