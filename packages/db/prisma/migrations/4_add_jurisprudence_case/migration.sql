CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "JurisprudenceCase" (
    "id" UUID NOT NULL,
    "ius" INTEGER NOT NULL,
    "claveTesis" TEXT NOT NULL,
    "tipoTesis" TEXT NOT NULL,
    "rubro" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "sala" TEXT,
    "fuente" TEXT,
    "localizacion" TEXT,
    "fechaPublicacion" TIMESTAMP(3),
    "tariffFractionRefs" TEXT[] NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "embeddingModel" TEXT,
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "JurisprudenceCase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "JurisprudenceCase_ius_key" ON "JurisprudenceCase"("ius");
