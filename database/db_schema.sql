DROP TABLE IF EXISTS Offers;
DROP TABLE IF EXISTS ListingImages;
DROP TABLE IF EXISTS Listings;
DROP TABLE IF EXISTS Categories;
DROP TABLE IF EXISTS Students;

CREATE TABLE Students (
    StudentID    INT AUTO_INCREMENT PRIMARY KEY,
    FullName     VARCHAR(100)   NOT NULL,
    Email        VARCHAR(255)   NOT NULL UNIQUE,
    PasswordHash VARCHAR(255)   NOT NULL,
    PhoneNumber  VARCHAR(20)    NOT NULL,
    ProfileImage VARCHAR(500)   NULL,
    SocialMediaLink VARCHAR(255) NULL,
    ResetToken   VARCHAR(64)     NULL,
    ResetTokenExpiresAt DATETIME NULL,
    CreatedAt    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Categories (
    CategoryID   INT AUTO_INCREMENT PRIMARY KEY,
    CategoryName VARCHAR(50)    NOT NULL UNIQUE
);

CREATE TABLE Listings (
    ListingID    INT AUTO_INCREMENT PRIMARY KEY,
    SellerID     INT             NOT NULL,
    CategoryID   INT             NOT NULL,
    Title        VARCHAR(100)   NOT NULL,
    Description  TEXT           NOT NULL,
    Price        DECIMAL(10,2)   NOT NULL CHECK (Price >= 0),
    `Condition`  VARCHAR(20)     NOT NULL CHECK (`Condition` IN ('New', 'Like New', 'Good', 'Fair')),
    Status       VARCHAR(20)     NOT NULL DEFAULT 'Active' CHECK (Status IN ('Active', 'Sold', 'Archived')),
    CreatedAt    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT FK_Listings_Seller   FOREIGN KEY (SellerID)   REFERENCES Students(StudentID),
    CONSTRAINT FK_Listings_Category FOREIGN KEY (CategoryID) REFERENCES Categories(CategoryID)
);

CREATE TABLE ListingImages (
    ImageID      INT AUTO_INCREMENT PRIMARY KEY,
    ListingID    INT             NOT NULL,
    ImagePath    VARCHAR(500)   NOT NULL,
    IsPrimary    BOOLEAN         NOT NULL DEFAULT 0,
    UploadedAt   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT FK_ListingImages_Listing FOREIGN KEY (ListingID)
        REFERENCES Listings(ListingID) ON DELETE CASCADE
);

CREATE TABLE Offers (
    OfferID      INT AUTO_INCREMENT PRIMARY KEY,
    ListingID    INT             NOT NULL,
    BuyerID      INT             NOT NULL,
    OfferAmount  DECIMAL(10,2)   NOT NULL CHECK (OfferAmount > 0),
    Message      TEXT            NULL,
    Status       VARCHAR(20)     NOT NULL DEFAULT 'Pending' CHECK (Status IN ('Pending', 'Accepted', 'Rejected')),
    CreatedAt    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT FK_Offers_Listing FOREIGN KEY (ListingID) REFERENCES Listings(ListingID),
    CONSTRAINT FK_Offers_Buyer   FOREIGN KEY (BuyerID)   REFERENCES Students(StudentID)
);

CREATE INDEX IX_Listings_SellerID    ON Listings(SellerID);
CREATE INDEX IX_Listings_CategoryID  ON Listings(CategoryID);
CREATE INDEX IX_Listings_Status      ON Listings(Status);
CREATE INDEX IX_ListingImages_ListingID ON ListingImages(ListingID);
CREATE INDEX IX_Offers_ListingID     ON Offers(ListingID);
CREATE INDEX IX_Offers_BuyerID       ON Offers(BuyerID);

INSERT INTO Categories (CategoryName) VALUES
    ('Textbooks'),
    ('Electronics'),
    ('Lab Supplies'),
    ('Stationery');

SELECT 'CampusTrade database schema created and configured successfully.' AS message;
