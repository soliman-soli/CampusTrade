IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'CampusTrade')
BEGIN
    CREATE DATABASE CampusTrade;
END
GO

USE CampusTrade;
GO

IF OBJECT_ID('dbo.Offers', 'U') IS NOT NULL DROP TABLE dbo.Offers;
IF OBJECT_ID('dbo.ListingImages', 'U') IS NOT NULL DROP TABLE dbo.ListingImages;
IF OBJECT_ID('dbo.Listings', 'U') IS NOT NULL DROP TABLE dbo.Listings;
IF OBJECT_ID('dbo.Categories', 'U') IS NOT NULL DROP TABLE dbo.Categories;
IF OBJECT_ID('dbo.Students', 'U') IS NOT NULL DROP TABLE dbo.Students;
GO

CREATE TABLE dbo.Students (
    StudentID    INT IDENTITY(1,1) PRIMARY KEY,
    FullName     NVARCHAR(100)   NOT NULL,
    Email        NVARCHAR(255)   NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255)   NOT NULL,
    PhoneNumber  NVARCHAR(20)    NOT NULL,
    ProfileImage NVARCHAR(500)   NULL,
    SocialMediaLink NVARCHAR(255) NULL,
    ResetToken   VARCHAR(64)     NULL,
    ResetTokenExpiresAt DATETIME NULL,
    CreatedAt    DATETIME        NOT NULL DEFAULT GETDATE()
);
GO

CREATE TABLE dbo.Categories (
    CategoryID   INT IDENTITY(1,1) PRIMARY KEY,
    CategoryName NVARCHAR(50)    NOT NULL UNIQUE
);
GO

CREATE TABLE dbo.Listings (
    ListingID    INT IDENTITY(1,1) PRIMARY KEY,
    SellerID     INT             NOT NULL,
    CategoryID   INT             NOT NULL,
    Title        NVARCHAR(100)   NOT NULL,
    Description  NVARCHAR(1000)  NOT NULL,
    Price        DECIMAL(10,2)   NOT NULL
        CONSTRAINT CK_Listings_Price CHECK (Price >= 0),
    Condition    VARCHAR(20)     NOT NULL
        CONSTRAINT CK_Listings_Condition CHECK (Condition IN ('New', 'Like New', 'Good', 'Fair')),
    Status       VARCHAR(20)     NOT NULL DEFAULT 'Active'
        CONSTRAINT CK_Listings_Status CHECK (Status IN ('Active', 'Sold', 'Archived')),
    CreatedAt    DATETIME        NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_Listings_Seller   FOREIGN KEY (SellerID)   REFERENCES dbo.Students(StudentID),
    CONSTRAINT FK_Listings_Category FOREIGN KEY (CategoryID) REFERENCES dbo.Categories(CategoryID)
);
GO

CREATE TABLE dbo.ListingImages (
    ImageID      INT IDENTITY(1,1) PRIMARY KEY,
    ListingID    INT             NOT NULL,
    ImagePath    NVARCHAR(500)   NOT NULL,
    IsPrimary    BIT             NOT NULL DEFAULT 0,
    UploadedAt   DATETIME        NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_ListingImages_Listing FOREIGN KEY (ListingID)
        REFERENCES dbo.Listings(ListingID) ON DELETE CASCADE
);
GO

CREATE TABLE dbo.Offers (
    OfferID      INT IDENTITY(1,1) PRIMARY KEY,
    ListingID    INT             NOT NULL,
    BuyerID      INT             NOT NULL,
    OfferAmount  DECIMAL(10,2)   NOT NULL
        CONSTRAINT CK_Offers_Amount CHECK (OfferAmount > 0),
    Message      NVARCHAR(500)   NULL,
    Status       VARCHAR(20)     NOT NULL DEFAULT 'Pending'
        CONSTRAINT CK_Offers_Status CHECK (Status IN ('Pending', 'Accepted', 'Rejected')),
    CreatedAt    DATETIME        NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_Offers_Listing FOREIGN KEY (ListingID) REFERENCES dbo.Listings(ListingID),
    CONSTRAINT FK_Offers_Buyer   FOREIGN KEY (BuyerID)   REFERENCES dbo.Students(StudentID)
);
GO

CREATE INDEX IX_Listings_SellerID    ON dbo.Listings(SellerID);
CREATE INDEX IX_Listings_CategoryID  ON dbo.Listings(CategoryID);
CREATE INDEX IX_Listings_Status      ON dbo.Listings(Status);
CREATE INDEX IX_ListingImages_ListingID ON dbo.ListingImages(ListingID);
CREATE INDEX IX_Offers_ListingID     ON dbo.Offers(ListingID);
CREATE INDEX IX_Offers_BuyerID       ON dbo.Offers(BuyerID);
GO

INSERT INTO dbo.Categories (CategoryName) VALUES
    ('Textbooks'),
    ('Electronics'),
    ('Lab Supplies'),
    ('Stationery');
GO

PRINT 'CampusTrade database schema created and configured successfully.';
GO
