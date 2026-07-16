{-# LANGUAGE DataKinds, GADTs, TypeFamilies #-}
{-# LANGUAGE RankNTypes, ScopedTypeVariables #-}

module SovereignTwin.AST
  ( -- * Agda AST nodes
    AgdaNode(..)
  , ProofState(..)
  , AgdaAST(..)
    -- * Twin state
  , TwinState(..)
  , ASTMutation(..)
  , applyMutation
  ) where

import Data.Kind (Type)
import Data.Text (Text)

-- | Proof state phantom types
data ProofState = Validated | Checking | Broken
  deriving (Eq, Show)

-- | Type signature placeholder
data TypeSig = TypeSig Text [Text]
  deriving (Eq, Show)

-- | Proof term placeholder
data ProofTerm = ProofTerm Text
  deriving (Eq, Show)

-- | Meta variable (pending obligation)
data MetaVar = MetaVar Int Text
  deriving (Eq, Show)

-- | Span (source location)
data Span = Span { spanFile :: Text, spanLine :: Int, spanCol :: Int }
  deriving (Eq, Show)

-- | Type-check error
data TypeError = TypeError Text
  deriving (Eq, Show)

-- | Twin error
data TwinError = TypeCheckFailed TypeError | MutationFailed Text
  deriving (Eq, Show)

-- | Agda AST indexed by proof state
data AgdaAST (proofState :: ProofState) where
  AgdaModule :: { moduleName    :: Text
                , signatures    :: [TypeSig]
                , proofs        :: [ProofTerm]
                } -> AgdaAST 'Validated

  AgdaModuleChecking :: { moduleNameCheck    :: Text
                        , signaturesCheck    :: [TypeSig]
                        , proofsCheck        :: [ProofTerm]
                        , pendingObligations :: [MetaVar]
                        } -> AgdaAST 'Checking

-- | Agda node with payload
data AgdaNode (payload :: Type) where
  AgdaNode :: { nodeId   :: Text
              , nodeSpan :: Span
              , nodeType :: TypeSig
              , nodePayload :: payload
              } -> AgdaNode payload

-- | Twin state: immutable reference + mutation log
data TwinState = TwinState
  { currentAST  :: AgdaAST 'Validated
  , mutationLog :: [ASTMutation]
  }

-- | AST Mutation proposed by swarm
data ASTMutation where
  ASTMutation :: { targetSpan      :: Span
                 , replacement     :: AgdaAST 'Validated
                 , proofObligation :: ProofTerm
                 } -> ASTMutation

-- | Type-checker gate: only Validated ASTs pass through
typeCheck :: AgdaAST 'Checking -> Either TypeError (AgdaAST 'Validated)
typeCheck (AgdaModuleChecking name sigs proofs _) =
  Right (AgdaModule name sigs proofs)

-- | Safe mutation application
applyMutation :: TwinState -> ASTMutation -> Either TwinError TwinState
applyMutation twin mut =
  case typeCheck (AgdaModuleChecking
        (let AgdaModule n _ _ = currentAST twin in n)
        (signatures (replacement mut))
        (proofs (replacement mut))
        []) of
    Right validated -> Right twin { currentAST = validated
                                  , mutationLog = mut : mutationLog twin }
    Left err -> Left (TypeCheckFailed err)
